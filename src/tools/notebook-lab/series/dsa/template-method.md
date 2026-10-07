# Template method

Some procedures have a fixed shape with variable steps. Every quality inspection takes a measurement, compares it with a tolerance, and records a result, but **how** it measures differs between a diameter check and a surface-finish check. Every data import reads, validates, converts and saves, but each file format reads differently. Writing the whole procedure again for each variant copies the fixed part, and the copies drift apart.

The **template method** pattern puts the fixed shape in one method of a base class, the **template method**, which calls other methods for the steps that vary. Subclasses override only those steps. The base class keeps control of the order, so, as long as subclasses leave `run` alone (Python won't stop them; it is a convention), no subclass can skip validation or forget to record a result. Unlike strategy, which uses composition, this pattern uses inheritance, and it is one of the cases the composition lesson called a good use of it: a framework designed to be subclassed.

This lesson covers:

- the problem: one procedure copied with small differences;
- the template method: a fixed skeleton calling overridable steps;
- **hooks**: optional steps with default behaviour, which subclasses may override;
- when to prefer passing functions (strategy) instead, and where Python itself uses the pattern.

## The problem: the same procedure, copied

A workshop inspects parts in several ways. Here are two inspections written separately. Predict before reading on: if the rule changes to "record every inspection with a timestamp", how many places change, and what happens if one is missed?

```python type
def inspect_diameter(part):
    measured = part["probe_mm"] * 2
    target, tolerance = part["nominal_d"], 0.02
    ok = abs(measured - target) <= tolerance
    return f"{part['id']} diameter {measured:.3f} mm: {'PASS' if ok else 'FAIL'}"

def inspect_length(part):
    measured = part["end_mm"] - part["start_mm"]
    target, tolerance = part["nominal_len"], 0.05
    ok = abs(measured - target) <= tolerance
    return f"{part['id']} length {measured:.3f} mm: {'PASS' if ok else 'FAIL'}"

shaft = {"id": "S-12", "probe_mm": 4.998, "nominal_d": 10.0, "start_mm": 0.0, "end_mm": 120.04, "nominal_len": 120.0}
print(inspect_diameter(shaft))
print(inspect_length(shaft))
```

```output
S-12 diameter 9.996 mm: PASS
S-12 length 120.040 mm: PASS
```

The two functions share their whole shape: measure, compare with a tolerance, format a result. Only the measuring and the numbers differ. Each new rule about **how** inspections are done (timestamps, rounding, logging failures to a quality database) must be added to every copy, and the copies will drift.

## A fixed skeleton with variable steps

Move the shape into a base class method, `run`, and make each varying part a method of its own. Subclasses implement `measure(part)` and say what their target and tolerance are. They never override `run`, so every inspection follows the same order, and a new rule is written once, in `run`. Predict before running: how many inspections record a timestamp, and how many lines of code did that take?

```python type
class Inspection:
    feature = "?"
    tolerance = 0.0

    def run(self, part, timestamp):
        measured = self.measure(part)
        target = self.target(part)
        ok = abs(measured - target) <= self.tolerance
        result = f"{part['id']} {self.feature} {measured:.3f} mm: {'PASS' if ok else 'FAIL'}"
        return f"[{timestamp}] {result}"

    def measure(self, part):
        raise NotImplementedError

    def target(self, part):
        raise NotImplementedError

class DiameterInspection(Inspection):
    feature, tolerance = "diameter", 0.02
    def measure(self, part):
        return part["probe_mm"] * 2
    def target(self, part):
        return part["nominal_d"]

class LengthInspection(Inspection):
    feature, tolerance = "length", 0.05
    def measure(self, part):
        return part["end_mm"] - part["start_mm"]
    def target(self, part):
        return part["nominal_len"]

for inspection in [DiameterInspection(), LengthInspection()]:
    print(inspection.run(shaft, "08:15"))
```

```output
[08:15] S-12 diameter 9.996 mm: PASS
[08:15] S-12 length 120.040 mm: PASS
```

`run` is the template method: it calls `measure` and `target`, which the base class only declares. The tolerance and feature name are class attributes, which subclasses simply set.

Both inspections gained timestamps from one line in `run`. The subclasses are now tiny: just the facts that differ. This style is sometimes called the **Hollywood principle**, "don't call us, we'll call you": the base class decides when each step runs and calls the subclass's code, instead of the subclass calling the base class.

## Hooks: optional steps

Not every step must be overridden. A **hook** is a step with a sensible default, often doing nothing, that a subclass may override to join in at a particular point. A data importer might offer hooks to skip header lines, to clean each row before conversion, and to run something after saving. A subclass overrides just the hooks it needs. Predict before running: which hooks does each importer override, and what does the semicolon importer do with comment lines?

```python type
class Importer:
    def run(self, text):
        lines = text.strip().splitlines()
        lines = lines[self.header_lines():]
        records = []
        for line in lines:
            line = self.clean(line)
            if line is None:
                continue
            records.append(self.convert(line))
        self.after_import(records)
        return records

    def header_lines(self):
        return 0

    def clean(self, line):
        return line.strip()

    def convert(self, line):
        raise NotImplementedError

    def after_import(self, records):
        pass

class CsvImporter(Importer):
    def header_lines(self):
        return 1
    def convert(self, line):
        part, qty = line.split(",")
        return (part, int(qty))

class SemicolonImporter(Importer):
    def clean(self, line):
        line = line.strip()
        return None if not line or line.startswith("#") else line
    def convert(self, line):
        part, qty = line.split(";")
        return (part.strip(), int(qty))
    def after_import(self, records):
        print(f"  (imported {len(records)} records from a legacy file)")

print(CsvImporter().run("part,qty\nbolt,40\nnut,25\n"))
print(SemicolonImporter().run("# stock take 3 May\nbolt; 38\n\n# end of bay 1\nwasher; 120\n"))
```

```output
[('bolt', 40), ('nut', 25)]
  (imported 2 records from a legacy file)
[('bolt', 38), ('washer', 120)]
```

`convert` is required, so the base raises `NotImplementedError`. `header_lines`, `clean` and `after_import` are hooks with harmless defaults.

The CSV importer overrides one hook (skip the header) and the required step. The legacy importer uses a cleaning hook that drops blank lines and `#` comments by returning `None`, and an after-import hook that reports. Neither touches `run`, so both follow the same order and get any future improvement to it for free.

## Template method or strategy?

The same problem could be solved with composition: an `Importer` that **receives** a `convert` function and optional hook functions, instead of subclasses overriding them. Choose by these questions:

- Do the variants share **several** related steps and some state? Subclasses keep them together, and template method fits.
- Is only **one** step varying, perhaps chosen at run time or mixed and matched? Pass a function (strategy): it avoids a subclass per combination.

Python uses the template method throughout its standard library. `unittest.TestCase` runs `setUp`, then a test method, then `tearDown` in a fixed order, and you override the parts you need. `threading.Thread.start` calls your `run`. `json.JSONEncoder.default` is a hook called for objects the encoder cannot handle. In each case, the library owns the skeleton and your subclass fills in the steps.

::: challenge Two more inspections [easy]
Using the lesson's `Inspection` base class (do not change it), write two subclasses:

- `FlatnessInspection`, with feature `"flatness"`, tolerance `0.01`, measuring `max(part["heights"]) - min(part["heights"])` against a target of `0`;
- `HoleSpacingInspection`, with feature `"hole spacing"`, tolerance `0.1`, measuring the distance between the two points `part["hole_a"]` and `part["hole_b"]` (each an `(x, y)` tuple) against `part["nominal_spacing"]`.

Override only what differs: the feature, the tolerance, `measure` and `target`.

```python starter
class FlatnessInspection(Inspection):
    feature, tolerance = "flatness", 0.01
    def measure(self, part):
        return 0.0
    def target(self, part):
        return 0

plate = {"id": "P-3", "heights": [5.002, 5.006, 4.999, 5.004]}
print(FlatnessInspection().run(plate, "09:00"))
```

```python solution
import math

class FlatnessInspection(Inspection):
    feature, tolerance = "flatness", 0.01
    def measure(self, part):
        return max(part["heights"]) - min(part["heights"])
    def target(self, part):
        return 0

class HoleSpacingInspection(Inspection):
    feature, tolerance = "hole spacing", 0.1
    def measure(self, part):
        return math.dist(part["hole_a"], part["hole_b"])
    def target(self, part):
        return part["nominal_spacing"]

plate = {"id": "P-3", "heights": [5.002, 5.006, 4.999, 5.004]}
print(FlatnessInspection().run(plate, "09:00"))
```

```python test
for _n in ["FlatnessInspection", "HoleSpacingInspection"]:
    assert _n in dir(), f"Define {_n}."
assert issubclass(FlatnessInspection, Inspection) and issubclass(HoleSpacingInspection, Inspection), "Both should subclass Inspection."
assert "run" not in vars(FlatnessInspection) and "run" not in vars(HoleSpacingInspection), "Don't override run: the base class owns the procedure."
_plate = {"id": "P-3", "heights": [5.002, 5.006, 4.999, 5.004]}
assert FlatnessInspection().run(_plate, "09:00") == "[09:00] P-3 flatness 0.007 mm: PASS", f"Got {FlatnessInspection().run(_plate, '09:00')!r}."
_warped = {"id": "P-4", "heights": [5.0, 5.03]}
assert FlatnessInspection().run(_warped, "09:01").endswith("0.030 mm: FAIL"), "0.03 mm of warp fails a 0.01 tolerance."
_bracket = {"id": "B-7", "hole_a": (10, 10), "hole_b": (40, 50), "nominal_spacing": 50.0}
assert HoleSpacingInspection().run(_bracket, "09:02") == "[09:02] B-7 hole spacing 50.000 mm: PASS", "The holes are 50 mm apart (a 30-40-50 triangle)."
_bad = dict(_bracket, hole_b=(40, 50.2))
assert HoleSpacingInspection().run(_bad, "09:03").endswith("FAIL"), "About 0.16 mm out fails a 0.1 tolerance."
"SUCCESS: Each new inspection is a few lines of facts, and the base class's procedure, timestamp and all, does the rest."
```

Hint: Set `feature` and `tolerance` as class attributes, and write `measure` and `target`. `math.dist(a, b)` gives the distance between two points.
:::

::: challenge A report with hooks [medium]
Write a base class `Report` whose template method `render(rows)` returns a string built in this fixed order: `self.header()` (if it returns a non-empty string), then `self.row(r)` for each row, then `self.footer(rows)` (if non-empty), joined with newlines. Rows are dicts. The defaults are: `header()` returns `""`, `footer(rows)` returns `""`, and `row(r)` raises `NotImplementedError`. Then write two subclasses that do **not** override `render`:

- `CsvReport(columns)`: the header is the column names joined by commas, and each row is its values for those columns, joined by commas (no footer);
- `TotalsReport(column)`: no header, each row is `f"{r['name']}: {r[column]}"`, and the footer is `f"TOTAL: {sum of column}"`.

```python starter
class Report:
    def render(self, rows):
        return ""

print(Report().render([]))
```

```python solution
class Report:
    def render(self, rows):
        parts = []
        if self.header():
            parts.append(self.header())
        parts.extend(self.row(r) for r in rows)
        footer = self.footer(rows)
        if footer:
            parts.append(footer)
        return "\n".join(parts)

    def header(self):
        return ""

    def row(self, r):
        raise NotImplementedError

    def footer(self, rows):
        return ""

class CsvReport(Report):
    def __init__(self, columns):
        self.columns = columns
    def header(self):
        return ",".join(self.columns)
    def row(self, r):
        return ",".join(str(r[c]) for c in self.columns)

class TotalsReport(Report):
    def __init__(self, column):
        self.column = column
    def row(self, r):
        return f"{r['name']}: {r[self.column]}"
    def footer(self, rows):
        return f"TOTAL: {sum(r[self.column] for r in rows)}"

rows = [{"name": "bolt", "qty": 40, "bin": "A1"}, {"name": "nut", "qty": 25, "bin": "A2"}]
print(CsvReport(["name", "qty"]).render(rows))
print(TotalsReport("qty").render(rows))
```

```python test
for _n in ["Report", "CsvReport", "TotalsReport"]:
    assert _n in dir(), f"Define {_n}."
_rows = [{"name": "bolt", "qty": 40, "bin": "A1"}, {"name": "nut", "qty": 25, "bin": "A2"}]
assert CsvReport(["name", "qty"]).render(_rows) == "name,qty\nbolt,40\nnut,25", f"Got {CsvReport(['name', 'qty']).render(_rows)!r}."
assert CsvReport(["bin"]).render([]) == "bin", "No rows: just the header."
assert TotalsReport("qty").render(_rows) == "bolt: 40\nnut: 25\nTOTAL: 65", f"Got {TotalsReport('qty').render(_rows)!r}."
assert TotalsReport("qty").render([]) == "TOTAL: 0", "No rows: just the footer."
assert "render" not in vars(CsvReport) and "render" not in vars(TotalsReport), "Subclasses fill in steps; only Report has render."
try:
    Report().render(_rows)
    assert False, "row() is required: the base should raise NotImplementedError."
except NotImplementedError:
    pass
assert Report().render([]) == "", "With no rows and no header or footer, the report is empty."
class _Shout(Report):
    def header(self): return "STOCK"
    def row(self, r): return r["name"].upper()
assert _Shout().render(_rows) == "STOCK\nBOLT\nNUT", "Any subclass overriding just some hooks works."
"SUCCESS: The base class owns the order, header, rows and footer, and each report overrides just the steps it changes."
```

Hint: In `render`, build a list: add the header only if it is non-empty, then each `self.row(r)`, then the footer if non-empty, and join with `"\n"`. The subclasses take their settings in `__init__` and override only the hooks they need.
:::

::: challenge A tiny test framework [hard]
`unittest.TestCase` is a template method. Build a small version. Write a base class `Case` with:

- hooks `setUp()` and `tearDown()` that do nothing by default;
- a template method `run()` that finds every method of the instance whose name starts with `"test_"`, in alphabetical order, and for each one: calls `setUp()`, then the test method, then `tearDown()`, which must run **even if the test raised**. It returns a dict from test name to outcome: `"pass"`; `"fail: <message>"` if the test raised `AssertionError`; or `"error: <ExceptionName>"` for any other exception. If `setUp` itself raises, the outcome is `"error: <ExceptionName>"`, the test method is not called, and `tearDown` is not called either.

Each test should start from fresh state, which is what `setUp` is for. The test will define its own subclasses of your `Case`.

```python starter
class Case:
    def run(self):
        return {}

print(Case().run())
```

```python solution
class Case:
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def run(self):
        results = {}
        for name in sorted(n for n in dir(self) if n.startswith("test_") and callable(getattr(self, n))):
            try:
                self.setUp()
            except Exception as error:
                results[name] = f"error: {type(error).__name__}"
                continue
            try:
                getattr(self, name)()
                results[name] = "pass"
            except AssertionError as error:
                results[name] = f"fail: {error}"
            except Exception as error:
                results[name] = f"error: {type(error).__name__}"
            finally:
                self.tearDown()
        return results

class StockTests(Case):
    def setUp(self):
        self.stock = {"bolt": 10}
    def test_issue(self):
        self.stock["bolt"] -= 3
        assert self.stock["bolt"] == 7
    def test_fresh(self):
        assert self.stock["bolt"] == 10, "setUp should give each test fresh stock"

print(StockTests().run())
```

```python test
assert "Case" in dir(), "Keep the class name Case."
_events = []
class _Tests(Case):
    def setUp(self):
        _events.append("setUp")
        self.items = [1, 2, 3]
    def tearDown(self):
        _events.append("tearDown")
    def test_b_pop(self):
        _events.append("b")
        self.items.pop()
        assert self.items == [1, 2]
    def test_a_fresh(self):
        _events.append("a")
        assert self.items == [1, 2, 3], "items should be fresh"
    def test_c_fails(self):
        _events.append("c")
        assert 1 + 1 == 3, "arithmetic is broken"
    def test_d_errors(self):
        _events.append("d")
        {}["missing"]
    def helper(self):
        _events.append("helper should never run")
_r = _Tests().run()
assert _r == {"test_a_fresh": "pass", "test_b_pop": "pass", "test_c_fails": "fail: arithmetic is broken", "test_d_errors": "error: KeyError"}, f"Got {_r}."
assert _events == ["setUp", "a", "tearDown", "setUp", "b", "tearDown", "setUp", "c", "tearDown", "setUp", "d", "tearDown"], f"setUp, test, tearDown for each test in alphabetical order, tearDown even after failures; got {_events}."
class _BadSetup(Case):
    def setUp(self):
        raise ConnectionError("no database")
    def tearDown(self):
        _events.append("should not tear down")
    def test_x(self):
        _events.append("should not run")
_events.clear()
assert _BadSetup().run() == {"test_x": "error: ConnectionError"} and _events == [], "If setUp fails, neither the test nor tearDown runs."
class _NoHooks(Case):
    def test_only(self):
        assert True
assert _NoHooks().run() == {"test_only": "pass"}, "The default hooks do nothing."
assert Case().run() == {}, "No tests, no results."
assert "run" not in vars(_Tests), "(the subclasses rely on your run)"
"SUCCESS: The framework owns the order, setUp, test, tearDown, and test classes just fill in the steps, the same deal unittest offers."
```

Hint: Collect the names with `sorted(n for n in dir(self) if n.startswith("test_"))`. For each, call `setUp` in its own `try` (recording an error and skipping on failure). Then call `getattr(self, name)()` inside `try` with `except AssertionError`, `except Exception` and a `finally` that calls `tearDown`.
:::

## What you learned

- The template method pattern puts the fixed skeleton of a procedure in one base-class method, which calls separate methods for the steps that vary. Subclasses override the steps, never the skeleton.
- The base class keeps control of the order, so every variant follows it, and a change to the procedure is made once.
- Hooks are optional steps with harmless defaults that subclasses may override to join in at a chosen point.
- Use template method when variants share several related steps; pass functions (strategy) when a single step varies or variants mix and match.
- `unittest.TestCase`, `threading.Thread` and `json.JSONEncoder` use the template method pattern: the library owns the skeleton and your subclass fills in steps.

The next lesson looks at the most widely used pattern in Python, so built in that it is easy to overlook: the iterator.
