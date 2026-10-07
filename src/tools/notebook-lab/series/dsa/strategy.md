# Strategy

A **design pattern** is a named, reusable solution to a problem that keeps coming up in object design. The idea comes from the 1994 book *Design Patterns* by Gamma, Helm, Johnson and Vlissides (the "Gang of Four"), which catalogued 23 of them. Knowing the patterns gives two things. You have ready-made shapes for common problems. And you share a vocabulary: "make the pricing a strategy" says in four words what would otherwise take a paragraph.

Each lesson in this part follows the same order: the problem in plain code, the pattern that solves it, and then the lighter way Python often reaches the same goal. Many patterns were invented for languages where functions cannot be passed around, and in Python some of them shrink to a few lines.

The first pattern, **Strategy**, is the open/closed principle applied to an algorithm. When a piece of code must do one step in one of several interchangeable ways, put each way in its own object (a strategy) behind a common interface, and let the code be given whichever strategy it should use.

This lesson covers:

- the problem: an algorithm with a mode switch inside it;
- the Strategy pattern with classes, and swapping strategies at run time;
- strategies as plain functions, which is usually enough in Python;
- stateful strategies, and choosing a strategy by name from configuration.

## The problem: a mode switch inside an algorithm

A courier company's dispatcher assigns each new delivery job to a driver. Different depots want different rules: the nearest driver, the driver with the fewest jobs, or (for fairness) each driver in turn. The first version passes a mode string and switches on it. Predict before reading on: what has to change to add a fourth rule, "the driver with the most free space in the van"?

```python type
import math

drivers = [
    {"name": "Asha", "at": (2, 3), "jobs": 4},
    {"name": "Ben", "at": (8, 1), "jobs": 1},
    {"name": "Caz", "at": (5, 5), "jobs": 2},
]
turn = {"next": 0}

def assign(job_at, mode):
    if mode == "nearest":
        return min(drivers, key=lambda d: math.dist(d["at"], job_at))["name"]
    elif mode == "least busy":
        return min(drivers, key=lambda d: d["jobs"])["name"]
    elif mode == "in turn":
        driver = drivers[turn["next"] % len(drivers)]
        turn["next"] += 1
        return driver["name"]
    raise ValueError(f"unknown mode {mode!r}")

print(assign((6, 6), "nearest"), assign((6, 6), "least busy"), assign((6, 6), "in turn"), assign((6, 6), "in turn"))
```

```output
Caz Ben Asha Ben
```

Every new rule is another branch in `assign`, and the state for the turn-taking rule (the `turn` counter) sits in a global, shared by everything. The selection rules are tangled into the dispatcher, and none of them can be tested or reused alone.

## The Strategy pattern

Give each rule its own class with one method, `choose(drivers, job_at)`. The dispatcher (in pattern language, the **context**) holds a strategy object and calls it, knowing nothing about which rule it is. A new rule is a new class. The turn-taking rule keeps its counter inside its own object, so two dispatchers each taking turns do not interfere. Predict before running: which driver does the second dispatcher pick for its first job?

```python type
class Nearest:
    def choose(self, drivers, job_at):
        return min(drivers, key=lambda d: math.dist(d["at"], job_at))

class LeastBusy:
    def choose(self, drivers, job_at):
        return min(drivers, key=lambda d: d["jobs"])

class InTurn:
    def __init__(self):
        self._next = 0
    def choose(self, drivers, job_at):
        driver = drivers[self._next % len(drivers)]
        self._next += 1
        return driver

class Dispatcher:
    def __init__(self, drivers, strategy):
        self.drivers, self.strategy = drivers, strategy

    def assign(self, job_at):
        driver = self.strategy.choose(self.drivers, job_at)
        driver["jobs"] += 1
        return driver["name"]

north = Dispatcher(drivers, InTurn())
south = Dispatcher(drivers, InTurn())
print("north:", [north.assign((0, 0)) for _ in range(4)])
print("south:", south.assign((0, 0)))
north.strategy = LeastBusy()
print("north switches to least busy:", north.assign((0, 0)))
print("jobs now:", {d["name"]: d["jobs"] for d in drivers})
```

```output
north: ['Asha', 'Ben', 'Caz', 'Asha']
south: Asha
north switches to least busy: Ben
jobs now: {'Asha': 7, 'Ben': 3, 'Caz': 3}
```

`Dispatcher.assign` also records the new job, which every rule needs, so that logic stays in the context and the strategies only choose.

The south dispatcher starts its own turn at Asha, because its `InTurn` object has its own counter. Swapping `north.strategy` changes the rule mid-run, with no new dispatcher. Each strategy can be tested alone with a hand-made list of drivers. The cost is a little ceremony: a class per rule, even when a rule is one line.

## Strategies as functions

In Python, functions are objects that can be passed around, so a strategy with one method and no state does not need a class at all. **The function is the strategy.** Python's own library is full of this: `sorted(items, key=...)`, `max(items, key=...)` and `re.sub(pattern, function, text)` all take a strategy as a function. Predict before running: is the function version shorter than the class version, and does it change anything about how the dispatcher is used?

```python type
def nearest(drivers, job_at):
    return min(drivers, key=lambda d: math.dist(d["at"], job_at))

def least_busy(drivers, job_at):
    return min(drivers, key=lambda d: d["jobs"])

def busiest(drivers, job_at):
    return max(drivers, key=lambda d: d["jobs"])

def assign_job(drivers, job_at, choose):
    driver = choose(drivers, job_at)
    driver["jobs"] += 1
    return driver["name"]

for rule in [nearest, least_busy, busiest]:
    print(f"{rule.__name__:<17}", assign_job(drivers, (6, 6), rule))
```

```output
nearest           Caz
least_busy        Ben
busiest           Asha
```

Three rules, three plain functions, and `assign_job` just calls whatever it is given. Adding a rule is writing a function. This is the Strategy pattern with the boilerplate removed: the interface is "a function taking drivers and a job location and returning a driver".

## Strategies with state, and choosing by name

When a strategy needs to remember something between calls, like the turn-taking counter, a plain function is not enough. There are two good options. A **class** with the state in attributes, as above. Or a **closure**: a function that creates the state and returns an inner function using it. The second is lighter for small cases.

Real programs often choose the strategy from configuration, such as a setting in a file saying `"rule": "least busy"`. A dictionary from names to strategy **factories** (functions that create a fresh strategy) turns the name into an object, and is the only place that needs updating when a rule is added. Predict before running: do the two turn-takers made from the configuration share a counter?

```python type
def in_turn():
    position = 0
    def choose(drivers, job_at):
        nonlocal position
        driver = drivers[position % len(drivers)]
        position += 1
        return driver
    return choose

RULES = {
    "nearest": lambda: nearest,
    "least busy": lambda: least_busy,
    "in turn": in_turn,
}

def rule_from_config(config):
    try:
        return RULES[config["rule"]]()
    except KeyError:
        raise ValueError(f"unknown rule {config.get('rule')!r}; choose from {sorted(RULES)}") from None

first = rule_from_config({"rule": "in turn"})
second = rule_from_config({"rule": "in turn"})
print([assign_job(drivers, (0, 0), first) for _ in range(3)], assign_job(drivers, (0, 0), second))
try:
    rule_from_config({"rule": "random"})
except ValueError as error:
    print("ValueError:", error)
```

```output
['Asha', 'Ben', 'Caz'] Asha
ValueError: unknown rule 'random'; choose from ['in turn', 'least busy', 'nearest']
```

The stateless rules are wrapped in `lambda: nearest` so every entry is a factory that is called the same way. `in_turn` already is a factory: each call creates a new counter.

Each call to `in_turn()` makes a fresh `position`, so the two turn-takers are independent: the second starts again at Asha. An unknown name gives a clear error listing the valid choices, instead of a `KeyError` deep inside the program.

Use the pattern when one step of an algorithm has several interchangeable versions and the choice is made by whoever uses the algorithm. Do not use it when there is only ever one version. A strategy parameter that nobody varies is just indirection.

::: challenge Sorting strategies for a parts list [easy]
A parts catalogue can be shown in different orders. Write `show(parts, order)`, which returns the list of part names sorted by the strategy `order`: a function taking one part (a dict with `"name"`, `"price"` and `"stock"`) and returning its sort key. Then write three strategies: `by_price` (cheapest first), `by_name` (alphabetical, ignoring capital letters), and `by_scarcity` (lowest stock first, ties broken by name, alphabetically ignoring case).

```python starter
def show(parts, order):
    return [p["name"] for p in parts]

parts = [{"name": "washer", "price": 0.05, "stock": 900},
         {"name": "Bolt", "price": 0.20, "stock": 15},
         {"name": "anchor", "price": 1.10, "stock": 15}]
print(show(parts, lambda p: p["price"]))
```

```python solution
def show(parts, order):
    return [p["name"] for p in sorted(parts, key=order)]

def by_price(part):
    return part["price"]

def by_name(part):
    return part["name"].lower()

def by_scarcity(part):
    return (part["stock"], part["name"].lower())

parts = [{"name": "washer", "price": 0.05, "stock": 900},
         {"name": "Bolt", "price": 0.20, "stock": 15},
         {"name": "anchor", "price": 1.10, "stock": 15}]
print(show(parts, by_price), show(parts, by_name), show(parts, by_scarcity))
```

```python test
for _n in ["show", "by_price", "by_name", "by_scarcity"]:
    assert _n in dir(), f"Define {_n}."
_parts = [{"name": "washer", "price": 0.05, "stock": 900}, {"name": "Bolt", "price": 0.20, "stock": 15},
          {"name": "anchor", "price": 1.10, "stock": 15}, {"name": "Clip", "price": 0.08, "stock": 3}]
assert show(_parts, by_price) == ["washer", "Clip", "Bolt", "anchor"], f"Cheapest first; got {show(_parts, by_price)}."
assert show(_parts, by_name) == ["anchor", "Bolt", "Clip", "washer"], f"Alphabetical ignoring case; got {show(_parts, by_name)}."
assert show(_parts, by_scarcity) == ["Clip", "anchor", "Bolt", "washer"], f"Lowest stock first, ties by name; got {show(_parts, by_scarcity)}."
assert show(_parts, lambda p: -p["stock"]) == ["washer", "Bolt", "anchor", "Clip"], "show must work with any strategy, including ones written later."
assert _parts[0]["name"] == "washer", "show should not reorder the original list."
assert show([], by_price) == [], "An empty catalogue shows nothing."
"SUCCESS: show runs any ordering it is given, and each ordering is a one-line function: Strategy without the ceremony."
```

Hint: `show` returns `[p["name"] for p in sorted(parts, key=order)]`. A strategy returning a tuple, like `(part["stock"], part["name"].lower())`, sorts by the first item and breaks ties with the second.
:::

::: challenge Fair turn-taking that skips the unavailable [medium]
Write a stateful strategy for the dispatcher in two styles, both following the lesson's interface `choose(drivers, job_at)`, which returns a driver dict. Drivers now have an `"available"` flag. Each strategy gives jobs to drivers **in turn**, in list order, skipping any driver who is unavailable at that moment, and continuing from just after the last driver it chose. If no driver is available it raises `LookupError`. Write it as a class, `TakeTurns` (create it with `TakeTurns()` and call its `choose` method), and as a closure factory, `take_turns()`, which returns a `choose` function. Each new strategy object starts from the first driver, independent of the others.

```python starter
class TakeTurns:
    def choose(self, drivers, job_at):
        return drivers[0]

def take_turns():
    def choose(drivers, job_at):
        return drivers[0]
    return choose

crew = [{"name": n, "available": True} for n in "ABC"]
t = TakeTurns()
print([t.choose(crew, None)["name"] for _ in range(4)])
```

```python solution
class TakeTurns:
    def __init__(self):
        self._next = 0

    def choose(self, drivers, job_at):
        for step in range(len(drivers)):
            index = (self._next + step) % len(drivers)
            if drivers[index]["available"]:
                self._next = index + 1
                return drivers[index]
        raise LookupError("no driver is available")

def take_turns():
    next_index = 0
    def choose(drivers, job_at):
        nonlocal next_index
        for step in range(len(drivers)):
            index = (next_index + step) % len(drivers)
            if drivers[index]["available"]:
                next_index = index + 1
                return drivers[index]
        raise LookupError("no driver is available")
    return choose

crew = [{"name": n, "available": True} for n in "ABC"]
t = TakeTurns()
print([t.choose(crew, None)["name"] for _ in range(4)])
```

```python test
assert "TakeTurns" in dir() and "take_turns" in dir(), "Define the TakeTurns class and the take_turns factory."
def _crew():
    return [{"name": _n, "available": True} for _n in "ABCD"]
for _label, _make in [("TakeTurns", lambda: TakeTurns().choose), ("take_turns", take_turns)]:
    _c = _crew()
    _pick = _make()
    _got = [_pick(_c, None)["name"] for _ in range(6)]
    assert _got == list("ABCDAB"), f"{_label}: in turn gives A B C D A B; got {_got}."
    _c = _crew()
    _pick = _make()
    _c[1]["available"] = False
    _got = [_pick(_c, None)["name"] for _ in range(4)]
    assert _got == list("ACDA"), f"{_label}: B is unavailable, so A C D A; got {_got}."
    _c[1]["available"] = True
    assert _pick(_c, None)["name"] == "B", f"{_label}: after A, B is next again once available."
    _c = _crew()
    _pick = _make()
    _pick(_c, None)
    for _d in _c:
        _d["available"] = False
    try:
        _pick(_c, None)
        assert False, f"{_label}: with nobody available, raise LookupError."
    except LookupError:
        pass
    _c = _crew()
    _one, _two = _make(), _make()
    _one(_c, None); _one(_c, None)
    assert _two(_c, None)["name"] == "A", f"{_label}: each strategy object keeps its own place in the turn order."
"SUCCESS: The turn order lives inside each strategy, as attributes or as a closure variable, so dispatchers never share or reset each other's turns."
```

Hint: Keep the index to try next (start 0). Look at up to `len(drivers)` drivers starting there, wrapping round with `%`, and return the first available one, setting the next index to just after it. If the loop finds nobody, raise `LookupError`. In the closure, declare `nonlocal` before assigning to the counter.
:::

::: challenge Parking charges from configuration [hard]
A car park chain sets each site's charging rule in a configuration file. Write three strategy classes, each with a method `charge(minutes)` returning the fee in pounds, rounded to 2 places:

- `Flat(fee)`: the same fee for any stay;
- `Hourly(rate, cap=None)`: `rate` per started hour (61 minutes is 2 hours), never more than `cap` if a cap is given;
- `Tiered(bands, then_hourly)`: `bands` is a list of `(up_to_minutes, fee)` in increasing order. A stay is charged the fee of the first band it fits in (minutes ≤ `up_to_minutes`). Beyond the last band, it is charged the last band's fee plus `then_hourly` per started hour over the last band's limit.

A stay of 0 minutes is free under every rule. Then write `from_config(config)`, which builds a strategy from a dict such as `{"rule": "hourly", "rate": 2.5, "cap": 12}`. The `"rule"` key picks the class by name (`"flat"`, `"hourly"` or `"tiered"`), and the remaining keys are passed as keyword arguments, without changing the dict it is given. An unknown rule raises `ValueError`.

```python starter
import math

def from_config(config):
    return None

print("define Flat, Hourly, Tiered and from_config")
```

```python solution
import math

class Flat:
    def __init__(self, fee):
        self.fee = fee
    def charge(self, minutes):
        return 0 if minutes <= 0 else round(self.fee, 2)

class Hourly:
    def __init__(self, rate, cap=None):
        self.rate, self.cap = rate, cap
    def charge(self, minutes):
        fee = math.ceil(minutes / 60) * self.rate if minutes > 0 else 0
        if self.cap is not None:
            fee = min(fee, self.cap)
        return round(fee, 2)

class Tiered:
    def __init__(self, bands, then_hourly):
        self.bands, self.then_hourly = bands, then_hourly
    def charge(self, minutes):
        if minutes <= 0:
            return 0
        for up_to, fee in self.bands:
            if minutes <= up_to:
                return round(fee, 2)
        last_limit, last_fee = self.bands[-1]
        return round(last_fee + math.ceil((minutes - last_limit) / 60) * self.then_hourly, 2)

RULES = {"flat": Flat, "hourly": Hourly, "tiered": Tiered}

def from_config(config):
    settings = dict(config)
    name = settings.pop("rule", None)
    if name not in RULES:
        raise ValueError(f"unknown rule {name!r}; choose from {sorted(RULES)}")
    return RULES[name](**settings)

print(from_config({"rule": "hourly", "rate": 2.5, "cap": 12}).charge(185))
```

```python test
for _n in ["Flat", "Hourly", "Tiered", "from_config"]:
    assert _n in dir(), f"Define {_n}."
assert Flat(8).charge(5) == 8 and Flat(8).charge(600) == 8 and Flat(8).charge(0) == 0, "Flat: one fee for any stay; 0 minutes is free."
_h = Hourly(2.5)
assert [_h.charge(_m) for _m in [0, 1, 60, 61, 120, 185]] == [0, 2.5, 2.5, 5.0, 5.0, 10.0], f"Hourly: per started hour; got {[_h.charge(_m) for _m in [0, 1, 60, 61, 120, 185]]}."
assert Hourly(2.5, cap=12).charge(600) == 12 and Hourly(2.5, cap=12).charge(185) == 10, "The cap limits the fee."
_t = Tiered([(30, 0), (120, 3), (240, 5)], 2)
assert [_t.charge(_m) for _m in [0, 20, 30, 31, 120, 121, 240, 241, 300, 301]] == [0, 0, 0, 3, 3, 5, 5, 7, 7, 9], f"Tiered bands then hourly; got {[_t.charge(_m) for _m in [0, 20, 30, 31, 120, 121, 240, 241, 300, 301]]}."
assert Tiered([(60, 1.999)], 0.5).charge(45) == 2.0, "Fees are rounded to 2 places."
_s = from_config({"rule": "hourly", "rate": 2.5, "cap": 12})
assert isinstance(_s, Hourly) and _s.charge(185) == 10, "from_config builds an Hourly from its settings."
assert from_config({"rule": "flat", "fee": 4}).charge(999) == 4, "from_config builds a Flat."
assert from_config({"rule": "tiered", "bands": [(60, 2)], "then_hourly": 1}).charge(125) == 4, "from_config builds a Tiered: 2 for the band, then 2 started hours at 1."
_cfg = {"rule": "flat", "fee": 4}
from_config(_cfg)
assert _cfg == {"rule": "flat", "fee": 4}, "from_config must not change the config dict it is given."
try:
    from_config({"rule": "per-minute", "rate": 0.1})
    assert False, "An unknown rule should raise ValueError."
except ValueError:
    pass
class _Meter:
    def __init__(self, strategy):
        self.strategy = strategy
    def bill(self, stays):
        return round(sum(self.strategy.charge(_m) for _m in stays), 2)
assert _Meter(from_config({"rule": "hourly", "rate": 1})).bill([10, 70, 0]) == 3, "Any code using charge() works with any of your strategies."
"SUCCESS: Each site's rule is a strategy object built from configuration by name, and the code that bills drivers never needs to know which rule a site uses."
```

Hint: Started hours are `math.ceil(minutes / 60)`. In `Tiered.charge`, loop over the bands and return the first fee whose limit is at least `minutes`; past the end, add `math.ceil((minutes - last_limit) / 60) * then_hourly` to the last fee. In `from_config`, copy the dict, `pop` the `"rule"`, look the class up in a dict of names, and call it with `**settings`.
:::

## What you learned

- A design pattern is a named, reusable solution to a recurring design problem. Patterns give ready-made shapes and a shared vocabulary.
- Strategy puts each version of one step of an algorithm in its own object behind a common interface, so the code using it (the context) can be given any version, and new versions need no edits to it.
- In Python, a stateless strategy is usually just a function, as with `sorted(key=...)`. Use a class or a closure when the strategy must remember things between calls.
- A dictionary of names to strategy factories turns configuration into strategy objects in one place, with a clear error for unknown names.
- Use Strategy when the choice of version really varies; a strategy parameter nobody varies is needless indirection.

The next lesson moves the same idea to object creation: the factory patterns, which decouple creating objects from using them.
