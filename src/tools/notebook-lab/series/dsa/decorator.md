# Decorator

An adapter changes an object's interface. A **decorator** keeps the interface exactly the same and adds behaviour around it: a calibrated sensor is still a sensor, a logged function is still the same function. Because the wrapper looks just like the thing it wraps, wrappers can be stacked, each adding one feature, in any combination. That makes the decorator pattern the standard answer to "I need these optional extras, in any mix", which inheritance answers with a subclass for every combination.

Python has a feature with the same name: the `@decorator` syntax, met in Python from Zero. (Where the name came from is disputed, and a function decorator may do anything to a function, but its most common use, wrapping a function in another with the same call signature, is exactly this pattern applied to functions.) This lesson covers both, and how they relate.

This lesson covers:

- the problem: optional features multiplying into subclasses;
- the decorator pattern: wrappers with the same interface, stacked;
- why the order of stacking matters;
- Python's function decorators done properly: `functools.wraps`, and decorators that take arguments.

## The problem: extras for every combination

A data logger reads values from a sensor. Different installations want different extras: a calibration correction, smoothing over the last few readings, clamping to the sensor's physical range. With inheritance, each combination is a subclass: `CalibratedSensor`, `SmoothedSensor`, `CalibratedSmoothedSensor`, `CalibratedClampedSensor`... With 3 optional extras there are 2³ = 8 combinations. With 5, there are 32. The composition lesson met this explosion with robots. The decorator pattern is the form of composition that fixes it when every extra **wraps the same interface**.

## Wrappers with the same interface

Every sensor has a method `read()` that returns the next value, or `None` when there are no more. A decorator is a class that **holds** a sensor and **is** a sensor: its `read()` calls the wrapped sensor's `read()` and adjusts the result. Since a decorated sensor is a sensor, it can be decorated again. Predict before running: what does the fully decorated sensor return for the raw readings?

```python type
class ListSensor:
    def __init__(self, values):
        self._values = iter(values)
    def read(self):
        return next(self._values, None)

class Calibrated:
    def __init__(self, sensor, offset, scale=1.0):
        self._sensor, self._offset, self._scale = sensor, offset, scale
    def read(self):
        value = self._sensor.read()
        return None if value is None else (value + self._offset) * self._scale

class Clamped:
    def __init__(self, sensor, low, high):
        self._sensor, self._low, self._high = sensor, low, high
    def read(self):
        value = self._sensor.read()
        return None if value is None else min(max(value, self._low), self._high)

class Smoothed:
    def __init__(self, sensor, window):
        self._sensor, self._window, self._recent = sensor, window, []
    def read(self):
        value = self._sensor.read()
        if value is None:
            return None
        self._recent = (self._recent + [value])[-self._window:]
        return round(sum(self._recent) / len(self._recent), 2)

def read_all(sensor):
    values = []
    while (value := sensor.read()) is not None:
        values.append(value)
    return values

raw = [20.0, 21.0, 95.0, 22.0, 23.0]
print("raw:        ", read_all(ListSensor(raw)))
print("calibrated: ", read_all(Calibrated(ListSensor(raw), offset=-0.5)))
print("all three:  ", read_all(Smoothed(Clamped(Calibrated(ListSensor(raw), offset=-0.5), -40, 60), window=3)))
```

```output
raw:         [20.0, 21.0, 95.0, 22.0, 23.0]
calibrated:  [19.5, 20.5, 94.5, 21.5, 22.5]
all three:   [19.5, 20.0, 33.33, 34.0, 34.67]
```

`while (value := sensor.read()) is not None:` uses the **walrus operator** `:=`, which assigns and tests in one expression: read a value, store it in `value`, and loop while it is not `None`.

The 95 is a glitch. Calibration subtracts 0.5, clamping caps the glitch at 60, and smoothing averages each reading with up to two before it. Three classes cover all 8 combinations, and `read_all` cannot tell a decorated sensor from a plain one. Each extra is written, and tested, once.

## Order matters

Decorators are applied from the inside out: the innermost wraps the real sensor and runs first on each value. Changing the order changes the result, sometimes importantly. Predict before running: is the glitch still capped if smoothing happens **before** clamping?

```python type
clamp_then_smooth = Smoothed(Clamped(ListSensor(raw), -40, 60), window=3)
smooth_then_clamp = Clamped(Smoothed(ListSensor(raw), window=3), -40, 60)
print("clamp, then smooth:", read_all(clamp_then_smooth))
print("smooth, then clamp:", read_all(smooth_then_clamp))
```

```output
clamp, then smooth: [20.0, 20.5, 33.67, 34.33, 35.0]
smooth, then clamp: [20.0, 20.5, 45.33, 46.0, 46.67]
```

Clamping first caps the glitch at 60 before it is averaged, so the three averages it touches peak at 35. Smoothing first averages in the full 95, giving 45 to 47. Each of those is inside the −40 to 60 range, so clamping afterwards does nothing, and the glitch inflates three outputs by more than 11 degrees each. When you stack decorators, decide the order deliberately. It is part of the design, not an accident of how the code was typed.

## Python's function decorators, properly

Python's `@decorator` applies the same idea to functions: `@timed` above `def f` means `f = timed(f)`, a wrapper with the same call signature that adds behaviour. Python from Zero wrote such wrappers. Two refinements make them production quality.

**Keep the wrapped function's identity.** A plain wrapper replaces the function's name and docstring with the wrapper's own, which confuses debugging, error messages and documentation tools. `functools.wraps(func)` copies them across, and records the original as `wrapper.__wrapped__`.

**Decorators with arguments.** `@retry(times=3)` first **calls** `retry(times=3)`, which must return the actual decorator. So a decorator that takes arguments is a function that returns a decorator: three levels of nested functions. Predict before running: what name does each decorated function report, and how many times does the flaky reader run?

```python type
import functools, time

def timed(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            wrapper.timings.append(time.perf_counter() - start)
    wrapper.timings = []
    return wrapper

def plain(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

def retry(times):
    def decorate(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except IOError:
                    if attempt == times:
                        raise
        return wrapper
    return decorate

@timed
def average(values):
    """Mean of a list of readings."""
    return sum(values) / len(values)

@plain
def maximum(values):
    """Largest reading."""
    return max(values)

attempts = []
@retry(times=3)
def flaky_read():
    attempts.append(1)
    if len(attempts) < 3:
        raise IOError("bus busy")
    return 21.5

print(average([1, 2, 3]), average.__name__, average.__doc__, len(average.timings), "timing recorded")
print(maximum.__name__, maximum.__doc__)
print(flaky_read(), "after", len(attempts), "attempts; name:", flaky_read.__name__)
```

`try` ... `finally` records the time even when the function raises. Attributes can be attached to functions like any object, which is how `timed` keeps its list of timings on the wrapper.

`average` keeps its name and docstring, thanks to `wraps`. `maximum`, wrapped without it, now claims to be called `wrapper` and has lost its docstring. The flaky reader failed twice and succeeded on the third attempt. Its caller just got 21.5, with no idea that retries happened.

Decorators show up across Python's standard library: `@functools.cache` adds memory, `@property` turns a method into an attribute, `@dataclass` decorates a whole class. Those last two use the syntax without being the pattern: they turn the function or class into something else. They also stack, like the sensor wrappers, from the bottom up: in `@a` over `@b` over `def f`, `f` is first wrapped by `b`, and the result by `a`; when called, `a`'s wrapper runs first, then `b`'s, then `f`.

::: challenge Price decorators [easy]
A quote starts from a base price, and optional adjustments wrap it. Every price object has a method `amount()`. Write:

- `BasePrice(value)`, whose `amount()` returns `value`;
- `WithVat(price, rate=0.2)`, whose `amount()` is the wrapped amount times `1 + rate`;
- `WithDiscount(price, percent)`, whose `amount()` is the wrapped amount less `percent`%;
- `WithMinimum(price, minimum)`, whose `amount()` is the wrapped amount, but never less than `minimum`.

Each wrapper must hold any object with an `amount()` method, including other wrappers. Do not round inside the classes.

```python starter
class BasePrice:
    def __init__(self, value):
        self.value = value
    def amount(self):
        return self.value

print(BasePrice(100).amount())
```

```python solution
class BasePrice:
    def __init__(self, value):
        self.value = value
    def amount(self):
        return self.value

class WithVat:
    def __init__(self, price, rate=0.2):
        self._price, self._rate = price, rate
    def amount(self):
        return self._price.amount() * (1 + self._rate)

class WithDiscount:
    def __init__(self, price, percent):
        self._price, self._percent = price, percent
    def amount(self):
        return self._price.amount() * (1 - self._percent / 100)

class WithMinimum:
    def __init__(self, price, minimum):
        self._price, self._minimum = price, minimum
    def amount(self):
        return max(self._price.amount(), self._minimum)

print(round(WithVat(WithDiscount(BasePrice(100), 10)).amount(), 2))
```

```python test
for _n in ["BasePrice", "WithVat", "WithDiscount", "WithMinimum"]:
    assert _n in dir(), f"Define {_n}."
assert abs(WithVat(BasePrice(100)).amount() - 120) < 1e-9 and abs(WithVat(BasePrice(100), rate=0.05).amount() - 105) < 1e-9, "WithVat multiplies by 1 + rate."
assert abs(WithDiscount(BasePrice(80), 25).amount() - 60) < 1e-9, "25% off 80 is 60."
assert WithMinimum(BasePrice(3), 5).amount() == 5 and WithMinimum(BasePrice(30), 5).amount() == 30, "WithMinimum never goes below its minimum."
_a = WithMinimum(WithVat(WithDiscount(BasePrice(10), 50)), 7)
assert abs(_a.amount() - 7) < 1e-9, "10, half off is 5, plus VAT is 6, minimum 7: 7."
_b = WithVat(WithMinimum(WithDiscount(BasePrice(10), 50), 7))
assert abs(_b.amount() - 8.4) < 1e-9, "Order matters: the minimum before VAT gives 7 × 1.2 = 8.4."
class _Live:
    def __init__(self):
        self.v = 10
    def amount(self):
        return self.v
_l = _Live()
_w = WithVat(_l)
_l.v = 20
assert abs(_w.amount() - 24) < 1e-9, "Wrappers should ask the wrapped price each time, and accept any object with amount()."
"SUCCESS: Four small classes give every combination of adjustments, in whatever order the pricing rules need."
```

Hint: Each wrapper stores the price it wraps in `__init__` and, in `amount()`, calls `self._price.amount()` and adjusts the result. `max(...)` handles the minimum.
:::

::: challenge Counting and checking decorators [medium]
Write two function decorators. Both must keep the wrapped function's `__name__` and `__doc__` with `functools.wraps`, and pass through any positional and keyword arguments.

- `count_calls` (used as `@count_calls`): the wrapper has an attribute `calls`, starting at 0, increased by 1 every time the function is called, including calls that raise.
- `in_range(low, high)` (used as `@in_range(0, 100)`, so it takes arguments): before calling the function, it checks that the **first positional argument** is between `low` and `high` inclusive, and raises `ValueError` naming the value if not. It does not call the function in that case.

```python starter
import functools

def count_calls(func):
    return func

def in_range(low, high):
    def decorate(func):
        return func
    return decorate

@count_calls
def scale(x, factor=2):
    """Scale a reading."""
    return x * factor

print(scale(3), scale.__name__)
```

```python solution
import functools

def count_calls(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)
    wrapper.calls = 0
    return wrapper

def in_range(low, high):
    def decorate(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            value = args[0]
            if not low <= value <= high:
                raise ValueError(f"{value} is outside {low} to {high}")
            return func(*args, **kwargs)
        return wrapper
    return decorate

@count_calls
def scale(x, factor=2):
    """Scale a reading."""
    return x * factor

print(scale(3), scale(4, factor=10), scale.calls, scale.__name__)
```

```python test
for _n in ["count_calls", "in_range"]:
    assert _n in dir(), f"Define {_n}."
@count_calls
def _scale(x, factor=2):
    """Scale a reading."""
    return x * factor
assert _scale.calls == 0, "calls starts at 0."
assert _scale(3) == 6 and _scale(4, factor=10) == 40 and _scale.calls == 2, "Arguments pass through, and calls are counted."
assert _scale.__name__ == "_scale" and _scale.__doc__ == "Scale a reading.", "Use functools.wraps to keep the name and docstring."
@count_calls
def _boom():
    raise RuntimeError("no")
for _ in range(3):
    try:
        _boom()
    except RuntimeError:
        pass
assert _boom.calls == 3, "Calls that raise still count."
_ran = []
@in_range(0, 100)
def _set_power(pct, mode="normal"):
    """Set laser power."""
    _ran.append((pct, mode))
    return pct
assert _set_power(0) == 0 and _set_power(100, mode="pulse") == 100 and _ran == [(0, "normal"), (100, "pulse")], "In-range values go through, with keyword arguments."
for _bad in [-1, 100.5, 250]:
    try:
        _set_power(_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError as _e:
        assert str(_bad) in str(_e), f"Name the value in the error; got {_e}."
assert len(_ran) == 2, "Out-of-range calls must not reach the function."
assert _set_power.__name__ == "_set_power" and _set_power.__doc__ == "Set laser power.", "in_range should keep the name and docstring too."
@count_calls
@in_range(1, 5)
def _stacked(n):
    return n
_stacked(3)
try:
    _stacked(9)
except ValueError:
    pass
assert _stacked.calls == 2 and _stacked.__name__ == "_stacked", "The decorators stack: the counter (outermost) sees both calls."
"SUCCESS: Both decorators keep the function's identity, pass arguments through, and stack: wrapping adds behaviour without changing what callers see."
```

Hint: `count_calls` defines `wrapper(*args, **kwargs)` decorated with `@functools.wraps(func)`, increments `wrapper.calls` before calling `func`, and sets `wrapper.calls = 0` before returning it. `in_range(low, high)` returns `decorate(func)`, which returns a wrapper that checks `args[0]` first.
:::

::: challenge Stream decorators with state [hard]
Readings arrive from a sensor object whose `read()` returns the next value, or `None` when the stream ends (like the lesson's `ListSensor`). Write three decorators, each a class that wraps any such sensor and is itself one:

- `Despike(sensor, max_jump)`: if a reading differs from the **last value it returned** by more than `max_jump`, return that last value again instead (the first reading is always returned as it is);
- `EveryNth(sensor, n)`: return only every n-th reading (the n-th, 2n-th, ...), reading and discarding the others; return `None` once the underlying sensor ends;
- `Delta(sensor)`: return the change from the previous reading, starting from the second reading (the first reading only primes it, so the first value returned is reading 2 minus reading 1).

The lesson's `read_all` and `ListSensor` are available. Every decorator must pass `None` through as soon as its sensor ends, and must work around any other.

```python starter
class Despike:
    def __init__(self, sensor, max_jump):
        self._sensor = sensor
    def read(self):
        return self._sensor.read()

print(read_all(Despike(ListSensor([20, 21, 80, 22]), 5)))
```

```python solution
class Despike:
    def __init__(self, sensor, max_jump):
        self._sensor, self._max_jump = sensor, max_jump
        self._last = None
    def read(self):
        value = self._sensor.read()
        if value is None:
            return None
        if self._last is not None and abs(value - self._last) > self._max_jump:
            return self._last
        self._last = value
        return value

class EveryNth:
    def __init__(self, sensor, n):
        self._sensor, self._n = sensor, n
    def read(self):
        for _ in range(self._n - 1):
            if self._sensor.read() is None:
                return None
        return self._sensor.read()

class Delta:
    def __init__(self, sensor):
        self._sensor = sensor
        self._previous = None
    def read(self):
        if self._previous is None:
            self._previous = self._sensor.read()
            if self._previous is None:
                return None
        value = self._sensor.read()
        if value is None:
            return None
        change = value - self._previous
        self._previous = value
        return change

print(read_all(Despike(ListSensor([20, 21, 80, 22]), 5)))
```

```python test
for _n in ["Despike", "EveryNth", "Delta"]:
    assert _n in dir(), f"Define {_n}."
assert read_all(Despike(ListSensor([20, 21, 80, 22, 30, 26]), 5)) == [20, 21, 21, 22, 22, 26], f"Despike holds the last good value through jumps over 5; got {read_all(Despike(ListSensor([20, 21, 80, 22, 30, 26]), 5))}."
assert read_all(Despike(ListSensor([]), 5)) == [] and read_all(Despike(ListSensor([7]), 0)) == [7], "Empty and single streams."
assert read_all(EveryNth(ListSensor(range(1, 11)), 3)) == [3, 6, 9], "Every 3rd of 1..10 is 3, 6, 9; the leftover 10 is dropped."
assert read_all(EveryNth(ListSensor([5, 6]), 1)) == [5, 6] and read_all(EveryNth(ListSensor([1, 2]), 3)) == [], "n = 1 keeps everything; too few readings give none."
assert read_all(Delta(ListSensor([10, 12, 11, 11, 15]))) == [2, -1, 0, 4], f"Changes between readings; got {read_all(Delta(ListSensor([10, 12, 11, 11, 15])))}."
assert read_all(Delta(ListSensor([3]))) == [] and read_all(Delta(ListSensor([]))) == [], "Fewer than two readings give no changes."
assert read_all(Delta(ListSensor([0, 0, 5]))) == [0, 5], "Zero readings and zero changes are real values, not the end of the stream."
_stack = Delta(EveryNth(Despike(ListSensor([10, 11, 90, 12, 13, 14, 60, 16]), 4), 2))
assert read_all(_stack) == [1, 2, 2], "Stacked: despike gives 10 11 11 12 13 14 14 16; every 2nd gives 11 12 14 16; the changes are 1, 2, 2."
"SUCCESS: Each decorator keeps its own state, passes the end of the stream through, and stacks on any other."
```

Hint: `Despike` remembers the last value it returned. `EveryNth.read` reads and discards n − 1 values (returning `None` if the stream ends meanwhile), then returns the next. `Delta` reads one value to prime itself on the first call, then returns each new value minus the previous one. Always test `value is None`, never just `not value`, because 0 is a real reading.
:::

## What you learned

- A decorator wraps an object and keeps its interface, adding behaviour around the wrapped calls. Because wrappers look like the wrapped thing, they stack, and n optional extras need n classes instead of 2ⁿ subclasses.
- Decorators apply from the inside out, and the order changes the result: clamp before smoothing, or a glitch spreads.
- Python's `@decorator` applies the same idea to functions. `functools.wraps` keeps the wrapped function's name, docstring and `__wrapped__`. A decorator that takes arguments is a function returning the decorator.
- Decorators can keep state between calls (timings, recent readings, the last good value) on the wrapper object or function.

The next lesson hides a complicated subsystem behind one simple interface: the facade.
