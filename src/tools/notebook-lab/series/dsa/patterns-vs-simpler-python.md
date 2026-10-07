# Patterns vs simpler Python

The design patterns were catalogued in 1994 for languages such as C++ and Smalltalk. In C++ of that era, a function could not easily be passed around as a value, a class could not be stored in a variable, and there were no generators or decorators. Several patterns exist mostly to work around those limits. In 1996 Peter Norvig showed that 16 of the 23 become simpler, or disappear entirely, in a dynamic language. Python is such a language. Strategy is a function, Command can be a closure, Iterator is a generator, Singleton is a module, Factory can be the class itself.

That does not make the patterns useless. Their **ideas** (vary one step, turn actions into objects, hide how a collection is stored) are as important as ever, and their names are still the best vocabulary for discussing design. But writing the C++-shaped version in Python adds classes and indirection that the language does not need. This lesson goes through the translations, introduces structural pattern matching, and sets out when the full, class-based pattern is still the right choice.

This lesson covers:

- the same design with and without the ceremony;
- a catalogue of the patterns Python makes lighter, and how;
- `match` statements as an alternative to type switches and visitors;
- when the full pattern pays for itself, and the smell of too many patterns.

## The same design, without the ceremony

Here is a sensor-smoothing choice written in the classic Strategy shape: an abstract base class, one subclass per algorithm, and a context holding an instance. Below it, the same design in plain Python: the strategies are functions, and the context takes one as an argument. Predict before running: do they compute the same results, and how many classes does each need?

```python type
from abc import ABC, abstractmethod

class Smoother(ABC):
    @abstractmethod
    def smooth(self, values): ...

class MovingAverage(Smoother):
    def __init__(self, window):
        self.window = window
    def smooth(self, values):
        return [round(sum(values[max(0, i - self.window + 1):i + 1]) / len(values[max(0, i - self.window + 1):i + 1]), 2) for i in range(len(values))]

class Median3(Smoother):
    def smooth(self, values):
        return [sorted(values[max(0, i - 1):i + 2])[len(values[max(0, i - 1):i + 2]) // 2] for i in range(len(values))]

class SensorChannel:
    def __init__(self, smoother: Smoother):
        self.smoother = smoother
    def process(self, values):
        return self.smoother.smooth(values)

def moving_average(values, window=3):
    out = []
    for i in range(len(values)):
        recent = values[max(0, i - window + 1):i + 1]
        out.append(round(sum(recent) / len(recent), 2))
    return out

def median3(values):
    return [sorted(values[max(0, i - 1):i + 2])[len(values[max(0, i - 1):i + 2]) // 2] for i in range(len(values))]

def process(values, smooth=moving_average):
    return smooth(values)

readings = [20.1, 20.3, 35.0, 20.2, 20.4, 20.6]
print("classes:  ", SensorChannel(MovingAverage(3)).process(readings), SensorChannel(Median3()).process(readings))
print("functions:", process(readings), process(readings, median3))
```

```output
classes:   [20.1, 20.2, 25.13, 25.17, 25.2, 20.4] [20.3, 20.3, 20.3, 20.4, 20.4, 20.6]
functions: [20.1, 20.2, 25.13, 25.17, 25.2, 20.4] [20.3, 20.3, 20.3, 20.4, 20.4, 20.6]
```

Both produce identical results. The class version needs four classes, one of them an abstract base, to say "a smoother is something that smooths". The function version needs none, because "a callable taking a list and returning a list" **is** the interface. A function with a default argument is also easier to call: `process(readings)` uses the default without building anything.

## A catalogue of lighter forms

Most of the patterns in this series have a lighter Python form, which the earlier lessons met along the way:

- **Strategy**: pass a function (`sorted(key=...)`, `process(smooth=...)`).
- **Command**: a closure, a `functools.partial`, or a pair of do/undo functions, when no state is needed. Use a class when the command must remember things or be stored as data.
- **Factory method and simple factory**: classes are callables, so pass the class itself, or keep a dict from names to classes. `@classmethod` alternative constructors cover the rest.
- **Abstract factory**: a module, a `SimpleNamespace` or a dataclass of functions.
- **Builder**: keyword arguments with defaults and a dataclass, for many settings. Keep a builder for step-by-step processes with cross-step rules.
- **Singleton**: a module-level object, or better, one instance created and passed in.
- **Prototype**: `copy.deepcopy` and `dataclasses.replace`.
- **Decorator**: `@decorator` functions for adding behaviour to functions; wrapper classes for objects.
- **Iterator**: generator functions and `itertools`.
- **Observer**: a list of callables.
- **Template method**: often a function that takes the varying steps as function arguments.
- **Visitor**: `functools.singledispatch`, name-based dispatch, or `match`.
- **State**: a dict-based transition table, when states differ only in their transitions.

The patterns that keep their full shape best are those about **structure**: adapter, composite and bridge describe how objects are arranged, and no language feature replaces an arrangement. The other structural and behavioural patterns keep their **idea** but often shrink, and Norvig counted most of them among his 16: a proxy can be a `__getattr__` forwarder, a flyweight a cached factory or a dict, a chain of responsibility a list of functions, a facade a module of functions.

## Structural pattern matching

Python 3.10 added the `match` statement. It compares a value against a series of **patterns** that describe its shape: a literal, a sequence of a given length, a dict with certain keys, or an instance of a class with certain attributes. It **binds** parts of the value to names as it goes. For processing small tree structures or messages of several kinds, a `match` can replace a type switch, or a visitor class, with something closer to a description of the data. Predict before running: which case handles each message, and what happens to the last one?

```python type
from dataclasses import dataclass

@dataclass
class Move:
    x: float
    y: float

@dataclass
class Spindle:
    rpm: int

def handle(message):
    match message:
        case Move(x=0, y=0):
            return "return to origin"
        case Move(x=x, y=y):
            return f"move to {x}, {y}"
        case Spindle(rpm=0):
            return "spindle stop"
        case Spindle(rpm=rpm) if rpm <= 24000:
            return f"spindle {rpm} rpm"
        case Spindle(rpm=rpm):
            return f"refused: {rpm} rpm is over the limit"
        case ("coolant", "on" | "off" as state):
            return f"coolant {state}"
        case {"alarm": code, **rest}:
            return f"alarm {code} with {sorted(rest)}"
        case _:
            return f"unknown message {message!r}"

for message in [Move(0, 0), Move(40, 12.5), Spindle(0), Spindle(18000), Spindle(30000),
                ("coolant", "on"), {"alarm": "E17", "axis": "Z", "load": 140}, ("coolant", "mist")]:
    print(f"{message!r:<42} -> {handle(message)}")
```

```output
Move(x=0, y=0)                             -> return to origin
Move(x=40, y=12.5)                         -> move to 40, 12.5
Spindle(rpm=0)                             -> spindle stop
Spindle(rpm=18000)                         -> spindle 18000 rpm
Spindle(rpm=30000)                         -> refused: 30000 rpm is over the limit
('coolant', 'on')                          -> coolant on
{'alarm': 'E17', 'axis': 'Z', 'load': 140} -> alarm E17 with ['axis', 'load']
('coolant', 'mist')                        -> unknown message ('coolant', 'mist')
```

In a class pattern such as `Move(x=x, y=y)`, `x=x` means "match the attribute `x` and bind it to the name `x`". Sequence patterns like `("coolant", state)` match lists as well as tuples, but never strings. `"on" | "off" as state` accepts either string and names it. `if rpm <= 24000` is a **guard**, an extra condition. `case _` matches anything.

Each message is handled by the first case whose pattern fits. `Move(0, 0)` hits the more specific origin case before the general one, so order matters, as in a chain of responsibility. The guard sends 30,000 rpm to the refusal case. The dict pattern accepts any dict with an `"alarm"` key and collects the rest. `("coolant", "mist")` matches no pattern and falls through to the default. A `match` keeps all the handling for a family of message shapes in one readable place. It is a good fit when the shapes are fixed and the code is the only consumer. When new shapes keep arriving, polymorphism, or a visitor, is still the better home for the logic.

## When the full pattern pays

Reach for the classic, class-based form when it earns its keep:

- **Several methods belong together.** A strategy that needs `estimate()`, `apply()` and `describe()` is three functions that must stay matched: a class keeps them together.
- **State must be remembered.** Undoable commands that store old values, iterators that pause mid-traversal, observers with per-subscriber state.
- **The object must be data.** Commands that are logged and replayed, mementos that are stored, configuration that is serialised. Dataclasses help here.
- **A framework expects it.** `unittest.TestCase`, `ast.NodeVisitor` and GUI toolkits are built around subclassing, and fighting them costs more than following them.
- **The team reads it more easily.** A well-known pattern name on a class tells readers what to expect.

The opposite failure is common too: **patternitis**, applying patterns because they exist. Signs include interfaces with one implementation, factories that build one class, abstract base classes nothing else implements, and three layers of indirection around a function call. Each layer costs reading time forever. The test from the start of the design part still applies. Ask what changes are likely, and add structure where those changes will land. Remove structure that no change has ever needed.

::: challenge De-classing the strategies [easy]
The pricing code below uses classes for strategies that hold no state and have one method each. Rewrite it in plain Python: three **functions**, `standard(qty, unit)`, `bulk(qty, unit)` (5% off from 100 units) and `trade(qty, unit)` (15% off always), and a dict `PRICING` mapping the names `"standard"`, `"bulk"` and `"trade"` to those functions. `quote(qty, unit, scheme="standard")` returns `round(PRICING[scheme](qty, unit), 2)` and raises `ValueError` for an unknown scheme. Your code must not define any classes.

```python starter
class Pricing:
    def price(self, qty, unit):
        raise NotImplementedError

class Standard(Pricing):
    def price(self, qty, unit):
        return qty * unit

class Bulk(Pricing):
    def price(self, qty, unit):
        return qty * unit * (0.95 if qty >= 100 else 1)

class Trade(Pricing):
    def price(self, qty, unit):
        return qty * unit * 0.85

def quote(qty, unit, scheme=Standard()):
    return round(scheme.price(qty, unit), 2)

print(quote(120, 0.5, Bulk()))
```

```python solution
def standard(qty, unit):
    return qty * unit

def bulk(qty, unit):
    return qty * unit * (0.95 if qty >= 100 else 1)

def trade(qty, unit):
    return qty * unit * 0.85

PRICING = {"standard": standard, "bulk": bulk, "trade": trade}

def quote(qty, unit, scheme="standard"):
    if scheme not in PRICING:
        raise ValueError(f"unknown scheme {scheme!r}; choose from {sorted(PRICING)}")
    return round(PRICING[scheme](qty, unit), 2)

print(quote(120, 0.5, "bulk"))
```

```python test
import ast as _ast
for _n in ["standard", "bulk", "trade", "PRICING", "quote"]:
    assert _n in dir(), f"Define {_n}."
assert not [_n for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.ClassDef)], "Define no classes: each strategy is a plain function."
assert set(PRICING) == {"standard", "bulk", "trade"} and PRICING["bulk"] is bulk, "PRICING maps names to the functions."
assert quote(10, 2.5) == 25.0 and quote(120, 0.5, "bulk") == 57.0 and quote(99, 1, "bulk") == 99 and quote(10, 10, "trade") == 85.0, "Check the three schemes."
try:
    quote(1, 1, "vip")
    assert False, "An unknown scheme should raise ValueError."
except ValueError:
    pass
PRICING["half"] = lambda qty, unit: qty * unit / 2
try:
    assert quote(10, 3, "half") == 15.0, "A scheme added to PRICING later must work in quote."
finally:
    del PRICING["half"]
"SUCCESS: Same behaviour with no classes at all: the functions are the strategies and a dict is the registry."
```

Hint: Each class's `price` method becomes a function of `(qty, unit)`. Build the dict after defining them, and in `quote`, check the name is in it before calling `PRICING[scheme](qty, unit)`.
:::

::: challenge Messages with match [medium]
A machine receives messages in several shapes. Write `route(message)` using a `match` statement (the test checks that you use one) that returns:

- for a tuple `("feed", n)` where n is an int or float from 1 to 200: `f"feed {n}%"`; with n outside that range: `"feed out of range"`;
- for a tuple `("tool", name)` where `name` is a string: `f"load tool {name}"`;
- for a tuple `("home",)` or the plain string `"home"`: `"homing all axes"`;
- for a dict with key `"jog"` holding a dict with keys `"axis"` and `"mm"`: `f"jog {axis} by {mm} mm"` (extra keys anywhere are fine);
- for a list of messages: a list of `route(m)` for each one (a list is always a list of messages, never a message itself);
- anything else: `"ignored"`.

```python starter
def route(message):
    return "ignored"

print(route(("feed", 80)))
```

```python solution
def route(message):
    match message:
        case list():
            return [route(m) for m in message]
        case ("feed", int() | float() as n) if 1 <= n <= 200:
            return f"feed {n}%"
        case ("feed", int() | float()):
            return "feed out of range"
        case ("tool", str() as name):
            return f"load tool {name}"
        case ("home",) | "home":
            return "homing all axes"
        case {"jog": {"axis": axis, "mm": mm}}:
            return f"jog {axis} by {mm} mm"
        case _:
            return "ignored"

print(route(("feed", 80)), route({"jog": {"axis": "X", "mm": -0.5}}))
```

```python test
import ast as _ast
assert "route" in dir(), "Keep the function's name as route."
assert any(isinstance(_n, _ast.Match) for _n in _ast.walk(_ast.parse(_source))), "Use a match statement."
assert route(("feed", 80)) == "feed 80%" and route(("feed", 1)) == "feed 1%" and route(("feed", 150.5)) == "feed 150.5%", "Feeds in range."
assert route(("feed", 0)) == "feed out of range" and route(("feed", 201)) == "feed out of range", "Feeds out of range."
assert route(("feed", "fast")) == "ignored", "A feed that is not a number is not a feed message."
assert route(("tool", "T4")) == "load tool T4" and route(("tool", 4)) == "ignored", "Tools are named by strings."
assert route(("home",)) == "homing all axes" and route("home") == "homing all axes", "Both forms of home."
assert route({"jog": {"axis": "X", "mm": -0.5}, "from": "pendant"}) == "jog X by -0.5 mm", "Jog dicts, extra keys allowed."
assert route({"jog": {"axis": "Y"}}) == "ignored" and route({"axis": "X"}) == "ignored", "Incomplete jogs are ignored."
assert route([("home",), ("tool", "T1"), "nonsense"]) == ["homing all axes", "load tool T1", "ignored"], "Lists route each message."
assert route(["home"]) == ["homing all axes"] and route(["feed", 80]) == ["ignored", "ignored"], "A list is a list of messages: sequence patterns match lists too, so check for lists first."
assert route(None) == "ignored" and route(("feed",)) == "ignored", "Anything else is ignored."
"SUCCESS: One match statement describes every message shape the machine understands, with guards for the ranges and a default for the rest."
```

Hint: Order the cases from specific to general: the in-range feed with a guard (`if 1 <= n <= 200`) before the general feed. `int() | float() as n` matches either type and binds it. `("home",) | "home"` combines two patterns. A dict pattern `{"jog": {"axis": axis, "mm": mm}}` ignores extra keys. Sequence patterns match lists as well as tuples (but never strings), so put `case list():` **first**, or a list such as `["home"]` would be taken for a message. The last case is `case _:`.
:::

::: challenge A command line without the ceremony [hard]
A machine's maintenance console accepts text commands such as `speed 1200` or `offset T4 0.05`. A classic design would use Command classes, a Factory to create them and an Interpreter to parse the text. In Python, a decorator and the functions' own signatures can do all three. Write:

- `COMMANDS`, a dict from command name to function;
- `command(name)`, a decorator factory that registers the decorated function under `name` and returns it unchanged;
- `dispatch(line)`, which splits the line into words, looks up the first word, and converts each remaining word to the **type annotated** on the matching parameter (`int`, `float` or `str`; an unannotated parameter stays a string) before calling the function and returning its result. Use `inspect.signature(function).parameters`. Raise `KeyError` for an unknown command, `TypeError` if the number of words does not match the number of parameters, and `ValueError` if a word cannot be converted;
- `help_text()`, returning one line per registered command, in alphabetical order: the name followed by its parameter names in angle brackets, then `" - "` and the first line of the function's docstring (or nothing after the name and parameters if it has no docstring), with single spaces between the parts, so `home - Home all axes.` and `beep`.

Then register three commands: `speed(rpm: int)` returning `f"spindle {rpm} rpm"`, `offset(tool: str, mm: float)` returning `f"{tool} offset {mm:+.3f} mm"`, and `home()` returning `"homing"`. Give each a one-line docstring.

```python starter
import inspect

COMMANDS = {}

def dispatch(line):
    return None

print(dispatch("speed 1200"))
```

```python solution
import inspect

COMMANDS = {}

def command(name):
    def register(function):
        COMMANDS[name] = function
        return function
    return register

def dispatch(line):
    words = line.split()
    if not words:
        raise KeyError("empty command")
    name, args = words[0], words[1:]
    function = COMMANDS[name]
    params = list(inspect.signature(function).parameters.values())
    if len(args) != len(params):
        raise TypeError(f"{name} takes {len(params)} argument(s), got {len(args)}")
    converted = []
    for word, param in zip(args, params):
        kind = param.annotation if param.annotation in (int, float, str) else str
        converted.append(kind(word))
    return function(*converted)

def help_text():
    lines = []
    for name in sorted(COMMANDS):
        function = COMMANDS[name]
        params = " ".join(f"<{p}>" for p in inspect.signature(function).parameters)
        head = f"{name} {params}".rstrip()
        doc = (function.__doc__ or "").strip().splitlines()
        lines.append(f"{head} - {doc[0]}" if doc else head)
    return "\n".join(lines)

@command("speed")
def speed(rpm: int):
    """Set the spindle speed."""
    return f"spindle {rpm} rpm"

@command("offset")
def offset(tool: str, mm: float):
    """Set a tool length offset."""
    return f"{tool} offset {mm:+.3f} mm"

@command("home")
def home():
    """Home all axes."""
    return "homing"

print(dispatch("speed 1200"), "|", dispatch("offset T4 0.05"))
print(help_text())
```

```python test
for _n in ["COMMANDS", "command", "dispatch", "help_text", "speed", "offset", "home"]:
    assert _n in dir(), f"Define {_n}."
assert dispatch("speed 1200") == "spindle 1200 rpm" and dispatch("offset T4 0.05") == "T4 offset +0.050 mm" and dispatch("home") == "homing", "The three commands dispatch with converted arguments."
assert dispatch("offset T1 -0.125") == "T1 offset -0.125 mm", "Negative floats convert."
for _bad, _err in [("jump 3", KeyError), ("speed", TypeError), ("speed 1 2", TypeError), ("speed fast", ValueError), ("speed 12.5", ValueError), ("home now", TypeError)]:
    try:
        dispatch(_bad)
        assert False, f"{_bad!r} should raise {_err.__name__}."
    except _err:
        pass
@command("label")
def _label(text, copies: int):
    return text * copies
assert COMMANDS["label"] is _label and dispatch("label ab 3") == "ababab", "A command registered later works; unannotated parameters stay strings."
@command("beep")
def _beep():
    return "beep"
_help = help_text().splitlines()
assert _help == ["beep", "home - Home all axes.", "label <text> <copies>", "offset <tool> <mm> - Set a tool length offset.", "speed <rpm> - Set the spindle speed."], f"Got {_help}."
assert command("x")(len) is len, "command(name) returns the function unchanged."
"SUCCESS: A decorator registers each command and its signature does the parsing: Command, Factory and Interpreter in a few lines of ordinary Python."
```

Hint: `command(name)` returns a `register(function)` that stores and returns the function. In `dispatch`, get `list(inspect.signature(function).parameters.values())`, compare the counts, and convert each word with `param.annotation` when it is `int`, `float` or `str` (otherwise `str`). For `help_text`, format `<name>` for each parameter and take the first line of `function.__doc__`.
:::

## What you learned

- Many classic patterns work around limits Python does not have. Strategies are functions, simple commands are closures, factories are classes or dicts, iterators are generators, singletons are modules.
- The ideas and the names still matter. The class-based form is just not always needed.
- Patterns about arrangement (adapter, composite, bridge) keep their shape; the others keep their ideas but often shrink to functions, dicts and modules.
- `match` describes message and tree shapes directly, with class, sequence and dict patterns, alternatives, `as` bindings and guards. It suits fixed sets of shapes; polymorphism suits growing ones.
- Use the full pattern when methods belong together, state must be kept, objects must be data, a framework expects it, or it reads better. Avoid patternitis: structure no change has ever needed is pure cost.

The next part puts everything together, starting with how to test algorithms thoroughly: property tests, brute-force oracles and invariant checks.
