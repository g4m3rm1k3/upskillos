# Factory method and simple factory

The Strategy lesson made **behaviour** swappable. This lesson does the same for **creation**. Code that uses objects often has to decide which class of object to create: a CSV reader or a JSON reader, an email notifier or an SMS one. When that decision is written out with `if` statements at every place an object is made, every new class means finding and editing all of those places. **Factories** put the decision in one place. Code that needs an object asks the factory, and does not name the concrete class at all.

This lesson covers:

- the problem: creation decisions scattered through a program;
- the **simple factory**: one function that decides which class to create, driven by a registry;
- the **factory method** pattern: a base class that leaves "which object to create" to its subclasses;
- Python's lighter tools: classes as factories, alternative constructors with `@classmethod`, and automatic registration.

## The problem: creation scattered everywhere

A test lab receives sensor readings as files in several formats. Each format has a reader class. Wherever the program loads a file, it decides which reader to use:

```python type
import json

class CsvReadings:
    def __init__(self, text):
        self.text = text
    def values(self):
        lines = self.text.strip().splitlines()[1:]
        return [float(line.split(",")[1]) for line in lines]

class JsonLinesReadings:
    def __init__(self, text):
        self.text = text
    def values(self):
        return [json.loads(line)["value"] for line in self.text.strip().splitlines()]

def average_reading(filename, text):
    if filename.endswith(".csv"):
        reader = CsvReadings(text)
    elif filename.endswith(".jsonl"):
        reader = JsonLinesReadings(text)
    else:
        raise ValueError(f"unknown format: {filename}")
    values = reader.values()
    return sum(values) / len(values)

def peak_reading(filename, text):
    if filename.endswith(".csv"):
        reader = CsvReadings(text)
    elif filename.endswith(".jsonl"):
        reader = JsonLinesReadings(text)
    else:
        raise ValueError(f"unknown format: {filename}")
    return max(reader.values())

csv_text = "time,value\n0,20.5\n1,21.0\n2,23.5\n"
print(average_reading("bench.csv", csv_text), peak_reading("bench.csv", csv_text))
```

```output
21.666666666666668 23.5
```

The format-choosing code is copied into both functions, and into every other function that loads a file. Adding a third format means finding them all. Predict before reading on: if one copy is missed, when does anyone find out?

Only when that particular function meets the new format, possibly months later, as a `ValueError` in production. The using code (averaging, finding peaks) is also coupled to every concrete reader class, though all it needs is "something with `values()`".

## The simple factory

Move the decision into one function, the **factory**, which takes whatever information decides the class (here, the file name) and returns a ready object. A dictionary from file extension to class makes the factory data-driven: adding a format is one new entry. The using code now names no reader class at all. Predict before running: what does adding a fixed-width format take?

```python type
READERS = {".csv": CsvReadings, ".jsonl": JsonLinesReadings}

def open_readings(filename, text):
    for extension, reader_class in READERS.items():
        if filename.endswith(extension):
            return reader_class(text)
    raise ValueError(f"unknown format {filename!r}; known: {sorted(READERS)}")

def average_reading(filename, text):
    values = open_readings(filename, text).values()
    return sum(values) / len(values)

def peak_reading(filename, text):
    return max(open_readings(filename, text).values())

class FixedWidthReadings:
    def __init__(self, text):
        self.text = text
    def values(self):
        return [float(line[8:16]) for line in self.text.strip().splitlines()]

READERS[".fw"] = FixedWidthReadings

fw_text = "0000    20.5    \n0001    22.0    \n"
jsonl_text = '{"value": 19.0}\n{"value": 25.0}\n'
print(average_reading("bench.csv", csv_text), peak_reading("probe.jsonl", jsonl_text), average_reading("old.fw", fw_text))
try:
    open_readings("notes.txt", "")
except ValueError as error:
    print("ValueError:", error)
```

```output
21.666666666666668 25.0 21.25
ValueError: unknown format 'notes.txt'; known: ['.csv', '.fw', '.jsonl']
```

`READERS` maps extensions to **classes**, not objects. In Python a class is itself a callable that makes instances, so `reader_class(text)` creates the right reader. A class is the simplest factory there is.

The fixed-width format was one class and one dictionary entry, and both using functions handled it at once. This "simple factory" is not one of the 23 Gang of Four patterns, but it is the factory most Python programs actually use.

## The factory method pattern

The Gang of Four's **factory method** solves a related problem. A base class runs a general procedure, and one step needs an object whose class should be chosen by **subclasses**. The base class calls a method, the factory method, to get that object, and each subclass overrides it to create the object it wants.

Here a `Report` base class always does the same things: collect the rows, build them with a formatter, and add a footer. Which formatter to use is left to `make_formatter()`. Predict before running: how many lines of `Report.render` change between the two reports?

```python type
class TextFormatter:
    def row(self, name, value):
        return f"{name:<10}{value:>8.2f}"
    def footer(self, count):
        return f"({count} rows)"

class HtmlFormatter:
    def row(self, name, value):
        return f"<tr><td>{name}</td><td>{value:.2f}</td></tr>"
    def footer(self, count):
        return f"<tr><td colspan=2>{count} rows</td></tr>"

class Report:
    def __init__(self, rows):
        self.rows = rows

    def make_formatter(self):
        raise NotImplementedError("subclasses choose a formatter")

    def render(self):
        formatter = self.make_formatter()
        lines = [formatter.row(name, value) for name, value in self.rows]
        lines.append(formatter.footer(len(self.rows)))
        return "\n".join(lines)

class TextReport(Report):
    def make_formatter(self):
        return TextFormatter()

class HtmlReport(Report):
    def make_formatter(self):
        return HtmlFormatter()

rows = [("bench", 21.67), ("probe", 22.0)]
print(TextReport(rows).render())
print(HtmlReport(rows).render())
```

```output
bench        21.67
probe        22.00
(2 rows)
<tr><td>bench</td><td>21.67</td></tr>
<tr><td>probe</td><td>22.00</td></tr>
<tr><td colspan=2>2 rows</td></tr>
```

`render` is written once, in `Report`, and never changes. Each subclass contributes a single short method saying which formatter it needs.

In Python, the same result is often reached more simply by **passing the factory in**, which is composition instead of inheritance: a `Report` whose `__init__` takes a `formatter` argument (any callable that makes a formatter), called as `Report(rows, formatter=TextFormatter)`. The factory method pattern earns its place when subclasses exist anyway for other reasons and the creation choice naturally belongs with them. Frameworks use it widely: a test framework's base class calls `make_client()`, and each test suite overrides it.

## Alternative constructors and automatic registration

Two Python features cover most remaining factory needs.

**Alternative constructors.** A class with one `__init__` often needs to be built from different inputs: a string, a dictionary, a file. A `@classmethod` named `from_something` is a factory that lives on the class itself, as with `datetime.fromisoformat` and `dict.fromkeys`. Because it receives `cls`, a constructor that builds with `cls(...)` also makes the right type when called on a subclass. (The `from_string` below is different: it is a registry-driven factory on the base class, which picks the class from the unit, whatever class it is called on.)

**Automatic registration.** With a registry dictionary, every new class must also remember to add itself to it. The special method `__init_subclass__` runs whenever a subclass is **defined**, so a base class can register each subclass automatically. Predict before running: is `Torque` in the registry, though no line adds it there?

```python type
class Quantity:
    unit = ""
    registry = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        Quantity.registry[cls.unit] = cls

    def __init__(self, value):
        self.value = value

    @classmethod
    def from_string(cls, text):
        number, unit = text.split()
        return Quantity.registry[unit](float(number))

    def __repr__(self):
        return f"{type(self).__name__}({self.value} {self.unit})"

class Mass(Quantity):
    unit = "kg"

class Length(Quantity):
    unit = "m"

class Torque(Quantity):
    unit = "Nm"

print(sorted(Quantity.registry))
print([Quantity.from_string(t) for t in ["12.5 kg", "0.3 m", "45 Nm"]])
```

```output
['Nm', 'kg', 'm']
[Mass(12.5 kg), Length(0.3 m), Torque(45.0 Nm)]
```

`super().__init_subclass__(**kwargs)` passes the call on, so this class still cooperates with any other base class that also uses the hook.

Defining `Torque` registered it, so `from_string` could create one from `"45 Nm"` without any change to the factory. The registry, the factory and the classes stay in step by construction: there is no separate list to forget to update.

::: challenge Alternative constructors [easy]
Write a class `Reading(sensor, value, unit)` that stores its three arguments as attributes of the same names, and give it two alternative constructors:

- `Reading.from_text(text)` parses `"T1 21.5 C"` (sensor, value, unit separated by spaces), with the value as a float;
- `Reading.from_dict(d)` takes `{"sensor": ..., "value": ..., "unit": ...}`, with the value converted to float.

Both must be `@classmethod`s that build the object with `cls(...)`, so that calling them on a subclass creates the subclass. Also give `Reading` an `__eq__` comparing all three attributes.

```python starter
class Reading:
    def __init__(self, sensor, value, unit):
        self.sensor, self.value, self.unit = sensor, value, unit

print(Reading("T1", 21.5, "C").value)
```

```python solution
class Reading:
    def __init__(self, sensor, value, unit):
        self.sensor, self.value, self.unit = sensor, value, unit

    @classmethod
    def from_text(cls, text):
        sensor, value, unit = text.split()
        return cls(sensor, float(value), unit)

    @classmethod
    def from_dict(cls, d):
        return cls(d["sensor"], float(d["value"]), d["unit"])

    def __eq__(self, other):
        return isinstance(other, Reading) and (self.sensor, self.value, self.unit) == (other.sensor, other.value, other.unit)

print(Reading.from_text("T1 21.5 C").value, Reading.from_dict({"sensor": "P2", "value": "3", "unit": "bar"}).value)
```

```python test
assert "Reading" in dir(), "Keep the class name Reading."
assert Reading.from_text("T1 21.5 C") == Reading("T1", 21.5, "C"), "from_text parses sensor, value and unit."
_r = Reading.from_text("P7 3 bar")
assert _r.value == 3.0 and isinstance(_r.value, float), "The value should be a float."
assert Reading.from_dict({"sensor": "P2", "value": "3.25", "unit": "bar"}) == Reading("P2", 3.25, "bar"), "from_dict converts the value to float."
assert Reading("A", 1.0, "C") != Reading("A", 1.0, "F") and Reading("A", 1.0, "C") != "A 1.0 C", "Equality compares all three attributes, and only with readings."
assert isinstance(Reading.__dict__["from_text"], classmethod) and isinstance(Reading.__dict__["from_dict"], classmethod), "Make both constructors @classmethods."
class _Calibrated(Reading):
    pass
assert type(_Calibrated.from_text("T1 1 C")) is _Calibrated and type(_Calibrated.from_dict({"sensor": "x", "value": 1, "unit": "C"})) is _Calibrated, "Build with cls(...), so calling them on a subclass makes the subclass."
"SUCCESS: The class carries its own factories, and because they use cls, subclasses get correctly typed objects from them for free."
```

Hint: Decorate each method with `@classmethod` and take `cls` as the first parameter. Split or look up the three parts, convert the value with `float`, and `return cls(sensor, value, unit)`.
:::

::: challenge A registry with a decorator [medium]
Write a simple factory for exporting tables, driven by a registry that classes join with a decorator. `EXPORTERS` is a dict from format name to class. `register(name)` returns a class decorator that adds the class under `name` and returns the class unchanged; registering a name twice raises `ValueError`. `export(rows, fmt)` creates the exporter for `fmt` and returns `exporter.render(rows)`, raising `ValueError` naming the known formats (sorted) for an unknown one. Then register two exporters, each with a `render(rows)` method, for `rows` a list of tuples:

- `"csv"`: each row's values joined by commas, rows joined by newlines;
- `"markdown"`: each row as `| a | b |`, rows joined by newlines.

```python starter
EXPORTERS = {}

def register(name):
    def decorate(cls):
        return cls
    return decorate

def export(rows, fmt):
    return ""

print(export([("bolt", 3), ("nut", 7)], "csv"))
```

```python solution
EXPORTERS = {}

def register(name):
    def decorate(cls):
        if name in EXPORTERS:
            raise ValueError(f"{name!r} is already registered")
        EXPORTERS[name] = cls
        return cls
    return decorate

def export(rows, fmt):
    if fmt not in EXPORTERS:
        raise ValueError(f"unknown format {fmt!r}; known: {sorted(EXPORTERS)}")
    return EXPORTERS[fmt]().render(rows)

@register("csv")
class CsvExporter:
    def render(self, rows):
        return "\n".join(",".join(str(v) for v in row) for row in rows)

@register("markdown")
class MarkdownExporter:
    def render(self, rows):
        return "\n".join("| " + " | ".join(str(v) for v in row) + " |" for row in rows)

print(export([("bolt", 3), ("nut", 7)], "csv"))
```

```python test
for _n in ["EXPORTERS", "register", "export"]:
    assert _n in dir(), f"Define {_n}."
_rows = [("bolt", 3), ("nut", 7)]
assert export(_rows, "csv") == "bolt,3\nnut,7", f"CSV export gave {export(_rows, 'csv')!r}."
assert export(_rows, "markdown") == "| bolt | 3 |\n| nut | 7 |", f"Markdown export gave {export(_rows, 'markdown')!r}."
assert export([], "csv") == "", "No rows, empty output."
@register("tsv")
class _Tsv:
    def render(self, rows):
        return "\n".join("\t".join(str(v) for v in r) for r in rows)
assert EXPORTERS["tsv"] is _Tsv and _Tsv().render([(1, 2)]) == "1\t2", "register should add the class and return it unchanged."
assert export(_rows, "tsv") == "bolt\t3\nnut\t7", "A newly registered exporter works through export with no other change."
try:
    @register("csv")
    class _Again:
        pass
    assert False, "Registering 'csv' twice should raise ValueError."
except ValueError:
    pass
assert export(_rows, "csv") == "bolt,3\nnut,7", "A refused registration must not replace the original."
try:
    export(_rows, "xml")
    assert False, "An unknown format should raise ValueError."
except ValueError as _e:
    assert "csv" in str(_e) and "markdown" in str(_e), f"Name the known formats in the error; got {_e}."
"SUCCESS: Each exporter registers itself where it is defined, and the factory finds it by name: adding a format never touches export()."
```

Hint: `register(name)` defines and returns an inner function `decorate(cls)`, which checks `name in EXPORTERS`, stores the class, and returns `cls`. `export` looks the name up, creates an instance with `EXPORTERS[fmt]()`, and calls its `render`.
:::

::: challenge Self-registering shapes [hard]
Write a base class `Shape` whose subclasses register themselves automatically with `__init_subclass__`. Each subclass sets a class attribute `kind`, a string. `Shape.registry` maps each `kind` to its class. Defining a subclass whose `kind` is already registered raises `TypeError`. A subclass without a `kind` raises `TypeError` too. Then write `Shape.create(spec)`, a classmethod factory that takes a dict such as `{"kind": "circle", "r": 2}`, looks up the class by `spec["kind"]`, and creates it with the remaining keys as keyword arguments. An unknown kind raises `ValueError`. Write `Circle` (kind `"circle"`, arguments `r`) and `Rect` (kind `"rect"`, arguments `w` and `h`), each with an `area()` method.

```python starter
import math

class Shape:
    registry = {}

print("define Shape with __init_subclass__ and create, plus Circle and Rect")
```

```python solution
import math

class Shape:
    registry = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        kind = cls.__dict__.get("kind")
        if not isinstance(kind, str):
            raise TypeError(f"{cls.__name__} must set a string kind")
        if kind in Shape.registry:
            raise TypeError(f"kind {kind!r} is already used by {Shape.registry[kind].__name__}")
        Shape.registry[kind] = cls

    @classmethod
    def create(cls, spec):
        settings = dict(spec)
        kind = settings.pop("kind", None)
        if kind not in Shape.registry:
            raise ValueError(f"unknown kind {kind!r}; known: {sorted(Shape.registry)}")
        return Shape.registry[kind](**settings)

class Circle(Shape):
    kind = "circle"
    def __init__(self, r):
        self.r = r
    def area(self):
        return math.pi * self.r ** 2

class Rect(Shape):
    kind = "rect"
    def __init__(self, w, h):
        self.w, self.h = w, h
    def area(self):
        return self.w * self.h

print(Shape.create({"kind": "rect", "w": 2, "h": 3}).area())
```

```python test
import math as _math
for _n in ["Shape", "Circle", "Rect"]:
    assert _n in dir(), f"Define {_n}."
assert Shape.registry.get("circle") is Circle and Shape.registry.get("rect") is Rect, "Circle and Rect should register themselves under their kinds."
_c = Shape.create({"kind": "circle", "r": 2})
assert isinstance(_c, Circle) and abs(_c.area() - 4 * _math.pi) < 1e-9, "create builds a Circle from its spec."
assert Shape.create({"kind": "rect", "w": 2, "h": 3}).area() == 6, "create builds a Rect from its spec."
_spec = {"kind": "rect", "w": 1, "h": 1}
Shape.create(_spec)
assert _spec == {"kind": "rect", "w": 1, "h": 1}, "create must not change the spec it is given."
class _Tri(Shape):
    kind = "_tri_test"
    def __init__(self, b, h):
        self.b, self.h = b, h
    def area(self):
        return self.b * self.h / 2
assert Shape.create({"kind": "_tri_test", "b": 4, "h": 3}).area() == 6, "A shape defined later is created by the same factory with no change to it."
try:
    class _Dup(Shape):
        kind = "circle"
    assert False, "A second subclass with kind 'circle' should raise TypeError when it is defined."
except TypeError:
    pass
assert Shape.registry["circle"] is Circle, "The original registration must survive a refused duplicate."
try:
    class _Nameless(Shape):
        pass
    assert False, "A subclass without a kind should raise TypeError."
except TypeError:
    pass
try:
    Shape.create({"kind": "hexagon", "side": 1})
    assert False, "An unknown kind should raise ValueError."
except ValueError:
    pass
"SUCCESS: Defining a shape class is enough to make it creatable by name: the registry can never fall out of step with the classes."
```

Hint: In `__init_subclass__(cls, **kwargs)`, call `super().__init_subclass__(**kwargs)`, read `cls.__dict__.get("kind")` (the subclass's own attribute, not an inherited one), raise `TypeError` if it is missing or already in `Shape.registry`, and store it. `create` copies the spec, pops `"kind"`, and calls the registered class with `**settings`.
:::

## What you learned

- When the choice of class is written out at every creation site, each new class means finding and editing them all. Factories put that choice in one place, and using code names no concrete class.
- A simple factory is a function, usually driven by a dict from names to classes. Classes are themselves factories: calling one makes an instance.
- The factory method pattern lets a base class run a fixed procedure while subclasses decide which object one step creates. In Python, passing a factory in is often simpler.
- `@classmethod` alternative constructors (`from_text`, `from_dict`) are factories living on the class; built with `cls(...)`, they work for subclasses too.
- A registration decorator, or `__init_subclass__`, adds each class to the registry where it is defined, so the registry cannot be forgotten.

The next lesson extends factories to whole **families** of related objects that must be used together: the abstract factory.
