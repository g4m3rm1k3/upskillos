# Abstract factory

A factory creates one kind of object. Sometimes objects come in **families** that only work together: a heading, a table and a paragraph for an HTML page; or a clock, a data store and a mailer for a test run. Mixing members of different families gives broken results: Markdown table syntax inside an HTML page, or a real mailer in a test that uses a fake clock. The **abstract factory** pattern gives each family one factory object that creates all its members, so code that takes one factory can only ever get a matching set.

This lesson covers:

- the problem: related objects chosen separately, and the mismatches that follow;
- the abstract factory: one object per family, with a creation method per member;
- families of infrastructure: swapping a whole production setup for a test setup in one move;
- the pattern's cost, and lighter Python forms.

## The problem: parts that must match

A workshop's reports can be produced as Markdown (for the wiki) or as HTML (for email). A report has headings, tables and notes, and each has a renderer per format. The first version passes each renderer in separately. Predict before running: what is wrong with the second report?

```python type
def md_heading(text):
    return f"## {text}"

def md_table(rows):
    return "\n".join("| " + " | ".join(str(v) for v in row) + " |" for row in rows)

def html_heading(text):
    return f"<h2>{text}</h2>"

def html_table(rows):
    body = "".join("<tr>" + "".join(f"<td>{v}</td>" for v in row) + "</tr>" for row in rows)
    return f"<table>{body}</table>"

def stock_report(rows, heading, table):
    return heading("Low stock") + "\n" + table(rows)

rows = [("bolt M8", 12), ("washer", 40)]
print(stock_report(rows, md_heading, md_table))
print()
print(stock_report(rows, html_heading, md_table))
```

```output
## Low stock
| bolt M8 | 12 |
| washer | 40 |

<h2>Low stock</h2>
| bolt M8 | 12 |
| washer | 40 |
```

The second call mixes an HTML heading with a Markdown table: a page that renders as a heading followed by lines of literal pipes. Nothing stopped it, because the two choices are independent arguments, and with three or four parts the number of wrong combinations grows. The rule that the parts must come from the **same** family exists only in the programmer's head.

## One factory per family

The fix is to make the family itself an object. A **kit** (the abstract factory) has one method per kind of part, and each concrete kit creates all its parts in one format. The report takes one kit, so it cannot mix. Adding a format means writing one new kit, and every report gains it. Predict before running: how many arguments does `stock_report` need now, and could it produce the mixed output?

```python type
class MarkdownKit:
    def heading(self, text):
        return f"## {text}"
    def table(self, rows):
        return "\n".join("| " + " | ".join(str(v) for v in row) + " |" for row in rows)
    def note(self, text):
        return f"> {text}"

class HtmlKit:
    def heading(self, text):
        return f"<h2>{text}</h2>"
    def table(self, rows):
        body = "".join("<tr>" + "".join(f"<td>{v}</td>" for v in row) + "</tr>" for row in rows)
        return f"<table>{body}</table>"
    def note(self, text):
        return f"<p><em>{text}</em></p>"

def stock_report(rows, kit):
    parts = [kit.heading("Low stock"), kit.table(rows)]
    if any(quantity < 20 for _, quantity in rows):
        parts.append(kit.note("Reorder anything below 20."))
    return "\n".join(parts)

for kit in [MarkdownKit(), HtmlKit()]:
    print(stock_report(rows, kit))
    print()
```

```output
## Low stock
| bolt M8 | 12 |
| washer | 40 |
> Reorder anything below 20.

<h2>Low stock</h2>
<table><tr><td>bolt M8</td><td>12</td></tr><tr><td>washer</td><td>40</td></tr></table>
<p><em>Reorder anything below 20.</em></p>
```

`stock_report` now asks one object for everything it builds. Whichever kit it is given, every part comes from that kit's family.

One argument instead of one per part, and the mixed report is now impossible to write by accident: there is simply no way to pass "Markdown tables with HTML headings". The kits are the "concrete factories". Strictly, these kits create text parts rather than objects; the pattern's usual form, where each method returns a collaborator object, is the environment kit in the next section. The interface they share (`heading`, `table`, `note`) is the "abstract factory" the pattern is named after. In Python it is usually a protocol rather than a base class.

## Families of infrastructure

The most valuable families in real programs are often not formats but **environments**. A program talks to a clock, a database and a mailer. In production all three are real. In tests all three should be fakes: a fixed clock, an in-memory store, and a mailer that records messages. A test that uses a fake clock with a real mailer could send real email about imaginary dates. An environment kit hands out a matching set, so a service needs one argument to run against either world. This is dependency injection from the earlier lesson, with the dependencies grouped into a family. Predict before running: which accounts get chased, and does anything real get sent?

```python type
from datetime import date

class TestKit:
    def __init__(self, today, accounts):
        self._today, self._accounts = today, accounts
        self.sent = []
    def clock(self):
        return lambda: self._today
    def store(self):
        accounts = self._accounts
        class MemoryStore:
            def unpaid(self):
                return [a for a in accounts if not a["paid"]]
        return MemoryStore()
    def mailer(self):
        sent = self.sent
        class RecordingMailer:
            def send(self, to, text):
                sent.append((to, text))
        return RecordingMailer()

class ChaseUnpaid:
    def __init__(self, kit):
        self.today = kit.clock()
        self.store = kit.store()
        self.mailer = kit.mailer()

    def run(self, days=30):
        chased = 0
        for account in self.store.unpaid():
            age = (self.today() - account["invoiced"]).days
            if age > days:
                self.mailer.send(account["email"], f"Invoice {account['invoice']} is {age} days old")
                chased += 1
        return chased

kit = TestKit(date(2026, 5, 1), [
    {"email": "a@x.com", "invoice": "A-1", "invoiced": date(2026, 3, 1), "paid": False},
    {"email": "b@x.com", "invoice": "B-7", "invoiced": date(2026, 4, 20), "paid": False},
    {"email": "c@x.com", "invoice": "C-3", "invoiced": date(2026, 2, 1), "paid": True},
])
print("chased:", ChaseUnpaid(kit).run())
print(kit.sent)
```

```output
chased: 1
[('a@x.com', 'Invoice A-1 is 61 days old')]
```

The store and mailer classes are defined inside the methods so that each can use the kit's data directly. They are created fresh each time the kit is asked.

Only `A-1` is chased: it is 61 days old. `B-7` is 11 days old, and `C-3` is paid. The recording mailer captured the message, and nothing left the program. A `ProductionKit` with the same three methods would return the real clock, a database store and an SMTP mailer, and `ChaseUnpaid` would not change at all.

## The cost, and lighter forms

The pattern has a known weak point. Adding a new **kind of part**, say a `chart`, means adding a method to **every** kit. It is the same trade-off as in the polymorphism lesson: new families (like new types) are cheap, and new members (like new operations) are expensive. Use an abstract factory when the set of parts is stable and families come and go. When the parts change often, it fights you.

In Python, a kit does not need to be a class. Anything holding the right callables works: a module (`import html_kit as kit`), a `types.SimpleNamespace`, or a frozen dataclass of functions. Here a plain-text family is a namespace of three plain functions, and `stock_report` accepts it unchanged:

```python type
from types import SimpleNamespace

plain = SimpleNamespace(
    heading=lambda text: text.upper(),
    table=lambda rows: "\n".join(f"{name:<12}{qty:>5}" for name, qty in rows),
    note=lambda text: f"NOTE: {text}",
)
print(stock_report(rows, plain))
```

```output
LOW STOCK
bolt M8        12
washer         40
NOTE: Reorder anything below 20.
```

`SimpleNamespace(a=1, b=2)` creates an object whose attributes are exactly the keywords given: a quick record with no class definition.

`stock_report` only ever asked for `kit.heading`, `kit.table` and `kit.note`, and a namespace of functions provides exactly those. This is the protocol idea once more: the factory is defined by what it can do, not by what it inherits.

::: challenge A plain-text kit [easy]
Write a third kit for `stock_report`, the `PlainKit` class, with the same three methods:

- `heading(text)`: the text in capitals, then a newline, then a row of `"="` as long as the text;
- `table(rows)`: one line per row, the name left-aligned in 12 characters and the quantity right-aligned in 5 (`f"{name:<12}{qty:>5}"`), lines joined with newlines;
- `note(text)`: `f"* {text}"`.

The lesson's `stock_report` is available; the test runs it with your kit.

```python starter
class PlainKit:
    def heading(self, text):
        return ""
    def table(self, rows):
        return ""
    def note(self, text):
        return ""

print(stock_report([("bolt M8", 12)], PlainKit()))
```

```python solution
class PlainKit:
    def heading(self, text):
        return text.upper() + "\n" + "=" * len(text)
    def table(self, rows):
        return "\n".join(f"{name:<12}{qty:>5}" for name, qty in rows)
    def note(self, text):
        return f"* {text}"

print(stock_report([("bolt M8", 12)], PlainKit()))
```

```python test
assert "PlainKit" in dir(), "Keep the class name PlainKit."
_k = PlainKit()
assert _k.heading("Low stock") == "LOW STOCK\n=========", f"heading gave {_k.heading('Low stock')!r}."
assert _k.table([("bolt M8", 12), ("washer", 40)]) == "bolt M8        12\nwasher         40", f"table gave {_k.table([('bolt M8', 12), ('washer', 40)])!r}."
assert _k.note("Reorder.") == "* Reorder.", "note starts with '* '."
_out = stock_report([("bolt M8", 12), ("washer", 40)], PlainKit())
assert _out == "LOW STOCK\n=========\nbolt M8        12\nwasher         40\n* Reorder anything below 20.", f"The whole report should come out in plain text; got {_out!r}."
assert "<" not in _out and "|" not in _out and "#" not in _out, "Every part should come from the plain family."
"SUCCESS: One new kit, and stock_report produces a whole plain-text report in a matching style without any change."
```

Hint: `heading` returns `text.upper() + "\n" + "=" * len(text)`. `table` joins the f-string lines with `"\n"`. Write all three as ordinary methods of the class.
:::

::: challenge Matching units [medium]
A test rig records lengths, masses and temperatures, and every value shown on one screen must use the same system of units. Write two kits, `MetricUnits` and `ImperialUnits`, each with three methods taking an SI value and returning a display string with one decimal place:

- `length(metres)`: metric `f"{m:.1f} m"`; imperial in feet, `f"{m * 3.28084:.1f} ft"`;
- `mass(kg)`: metric `f"{kg:.1f} kg"`; imperial in pounds, `f"{kg * 2.20462:.1f} lb"`;
- `temperature(celsius)`: metric `f"{c:.1f} °C"`; imperial in Fahrenheit, `f"{c * 9 / 5 + 32:.1f} °F"`.

Then write `units_for(region)`, a factory returning a `MetricUnits()` for any region except `"US"`, `"LR"` and `"MM"`, which get `ImperialUnits()`. Finally write `rig_panel(reading, region)`, which takes a dict with `"length"`, `"mass"` and `"temperature"` in SI units and returns the three strings joined by `" | "`. It must get **all three** from a single kit returned by `units_for`.

```python starter
def rig_panel(reading, region):
    return ""

print(rig_panel({"length": 2.0, "mass": 10.0, "temperature": 21.0}, "GB"))
```

```python solution
class MetricUnits:
    def length(self, m):
        return f"{m:.1f} m"
    def mass(self, kg):
        return f"{kg:.1f} kg"
    def temperature(self, c):
        return f"{c:.1f} °C"

class ImperialUnits:
    def length(self, m):
        return f"{m * 3.28084:.1f} ft"
    def mass(self, kg):
        return f"{kg * 2.20462:.1f} lb"
    def temperature(self, c):
        return f"{c * 9 / 5 + 32:.1f} °F"

def units_for(region):
    return ImperialUnits() if region in {"US", "LR", "MM"} else MetricUnits()

def rig_panel(reading, region):
    kit = units_for(region)
    return " | ".join([kit.length(reading["length"]), kit.mass(reading["mass"]), kit.temperature(reading["temperature"])])

print(rig_panel({"length": 2.0, "mass": 10.0, "temperature": 21.0}, "GB"))
```

```python test
for _n in ["MetricUnits", "ImperialUnits", "units_for", "rig_panel"]:
    assert _n in dir(), f"Define {_n}."
_r = {"length": 2.0, "mass": 10.0, "temperature": 21.0}
assert rig_panel(_r, "GB") == "2.0 m | 10.0 kg | 21.0 °C", f"GB gives metric; got {rig_panel(_r, 'GB')!r}."
assert rig_panel(_r, "US") == "6.6 ft | 22.0 lb | 69.8 °F", f"US gives imperial; got {rig_panel(_r, 'US')!r}."
assert isinstance(units_for("LR"), ImperialUnits) and isinstance(units_for("MM"), ImperialUnits) and isinstance(units_for("FR"), MetricUnits), "Only US, LR and MM use imperial units."
assert ImperialUnits().temperature(-40) == "-40.0 °F" and MetricUnits().mass(0.25) == "0.2 kg", "Conversions and one decimal place."
_calls = []
_real = units_for
def _spy(region):
    _calls.append(region)
    return _real(region)
units_for = _spy
try:
    rig_panel(_r, "US")
finally:
    units_for = _real
assert _calls == ["US"], f"rig_panel should ask units_for for one kit and use it for all three values; it was called {len(_calls)} times."
class _Odd:
    def length(self, m): return "L"
    def mass(self, kg): return "M"
    def temperature(self, c): return "T"
units_for = lambda region: _Odd()
try:
    assert rig_panel(_r, "XX") == "L | M | T", "All three values must come from the kit units_for returns."
finally:
    units_for = _real
"SUCCESS: Each screen asks for one units kit and gets matching units for everything on it: a mixed metric and imperial panel can't happen."
```

Hint: The two kits are classes with three formatting methods each. `units_for` checks the region against a set. In `rig_panel`, call `units_for(region)` once, keep the kit, and build all three strings from it.
:::

::: challenge Swappable environments [hard]
A plant shuts machines down for maintenance when their run hours pass a limit, and logs each shutdown. Write `MaintenanceSweep(kit)`. Its constructor asks the kit once each for `kit.clock()` (a function returning the current hour, an int), `kit.machines()` (an object with `running()`, returning a list of dicts with `"id"` and `"started"`, the hour each started, and `stop(machine_id)`), and `kit.log()` (an object with `write(line)`). Its method `run(limit_hours)` stops every running machine that has run **at least** `limit_hours` hours (now minus started), in order of id. For each one it writes the log line `f"{now}: stopped {id} after {hours} h"`, and it returns the list of stopped ids.

Then write the test environment, `FakePlant(now, machines)`, whose three methods return a fixed clock, an in-memory machine store (stopping removes the machine from `running()`), and a log keeping lines in a list. The kit must expose that list as its `lines` attribute, and the store's current machines as `running_ids()`, a sorted list of the running machine ids.

```python starter
class MaintenanceSweep:
    def __init__(self, kit):
        pass
    def run(self, limit_hours):
        return []

print("write MaintenanceSweep and FakePlant")
```

```python solution
class MaintenanceSweep:
    def __init__(self, kit):
        self.clock = kit.clock()
        self.machines = kit.machines()
        self.log = kit.log()

    def run(self, limit_hours):
        now = self.clock()
        stopped = []
        for machine in sorted(self.machines.running(), key=lambda m: m["id"]):
            hours = now - machine["started"]
            if hours >= limit_hours:
                self.machines.stop(machine["id"])
                self.log.write(f"{now}: stopped {machine['id']} after {hours} h")
                stopped.append(machine["id"])
        return stopped

class FakePlant:
    def __init__(self, now, machines):
        self._now = now
        self._running = {m["id"]: dict(m) for m in machines}
        self.lines = []

    def clock(self):
        return lambda: self._now

    def machines(self):
        running = self._running
        class Store:
            def running(self):
                return list(running.values())
            def stop(self, machine_id):
                del running[machine_id]
        return Store()

    def log(self):
        lines = self.lines
        class Log:
            def write(self, line):
                lines.append(line)
        return Log()

    def running_ids(self):
        return sorted(self._running)

plant = FakePlant(100, [{"id": "press", "started": 10}, {"id": "lathe", "started": 95}])
print(MaintenanceSweep(plant).run(50), plant.lines, plant.running_ids())
```

```python test
for _n in ["MaintenanceSweep", "FakePlant"]:
    assert _n in dir(), f"Define {_n}."
_p = FakePlant(100, [{"id": "press", "started": 10}, {"id": "lathe", "started": 95}, {"id": "drill", "started": 50}])
assert MaintenanceSweep(_p).run(50) == ["drill", "press"], "drill (50 h) and press (90 h) reach the 50 h limit; lathe (5 h) does not. Stop in order of id."
assert _p.lines == ["100: stopped drill after 50 h", "100: stopped press after 90 h"], f"Log lines: {_p.lines}."
assert _p.running_ids() == ["lathe"], "Stopped machines leave the running list."
assert MaintenanceSweep(_p).run(50) == [] and len(_p.lines) == 2, "A second sweep finds nothing more to stop."
class _SpyKit:
    def __init__(self):
        self.asked = []
        self.stopped, self.written = [], []
    def clock(self):
        self.asked.append("clock")
        return lambda: 30
    def machines(self):
        self.asked.append("machines")
        kit = self
        class _S:
            def running(self):
                return [{"id": "b", "started": 0}, {"id": "a", "started": 25}, {"id": "c", "started": 10}]
            def stop(self, machine_id):
                kit.stopped.append(machine_id)
        return _S()
    def log(self):
        self.asked.append("log")
        kit = self
        class _L:
            def write(self, line):
                kit.written.append(line)
        return _L()
_k = _SpyKit()
_sweep = MaintenanceSweep(_k)
assert sorted(_k.asked) == ["clock", "log", "machines"], f"Ask the kit for each collaborator exactly once, in the constructor; it was asked for {_k.asked}."
assert _sweep.run(20) == ["b", "c"] and _k.stopped == ["b", "c"] and _k.written == ["30: stopped b after 30 h", "30: stopped c after 20 h"], "MaintenanceSweep must work with any kit providing the three collaborators."
_k.asked.clear(); _sweep.run(20)
assert _k.asked == [], "run() should reuse the collaborators, not ask the kit again."
"SUCCESS: The sweep takes one kit and gets a matching clock, machine store and log, so a whole fake plant replaces the real one in a single argument."
```

Hint: In the constructor, call `kit.clock()`, `kit.machines()` and `kit.log()` once and keep the results. In `run`, read the time once, sort `running()` by id, and stop, log and record each machine at or over the limit. In `FakePlant`, keep a dict of running machines and a list of lines, and return small objects whose methods use them, as `TestKit` does in the lesson.
:::

## What you learned

- When related objects must be used together, choosing each one separately lets mismatched combinations through.
- An abstract factory is one object per family, with a creation method for each member. Code that takes one factory can only get a matching set, and a new family is one new factory.
- Environment kits group the infrastructure (clock, store, mailer) of production or of a test into one object, so a service runs against either world through a single argument.
- The cost: a new kind of member means changing every factory. Use the pattern when the members are stable and families vary.
- In Python a factory can be a class, a module, a `SimpleNamespace` or a dataclass of functions: anything with the right methods.

The next lesson builds a single complex object step by step: the builder pattern, and how keyword arguments and dataclasses replace much of it in Python.
