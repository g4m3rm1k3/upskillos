# Facade

Many subsystems are powerful and fiddly at the same time. Starting a job on a CNC machine means checking the door, homing the axes, loading the right tool, setting the work offset, starting the spindle and only then running the program, in that order, and turning everything off safely if a step fails. Every piece of code that starts a job would have to know all of that. A **facade** is one simple object or function in front of the subsystem that offers the few operations most callers need, and does the fiddly sequence for them.

The name is architectural: a building's facade is the simple front that hides its complicated structure. A facade does not replace the subsystem or forbid using it directly. It gives the common path a short, safe road.

This lesson covers:

- the problem: callers repeating a long, ordered sequence of calls into a subsystem;
- a facade that packages the sequence, and keeps the subsystem available;
- keeping the facade thin, so it coordinates rather than reimplements;
- cleaning up safely when a step in the sequence fails.

## The problem: every caller knows too much

A simulated machine has several parts, each with its own interface. Here is the code to run one job, written out in full. Predict before reading on: how many calls into the subsystem does one job take, and what happens if three different screens of the operator software each copy this sequence?

```python type
class Door:
    def __init__(self):
        self.closed = True
    def is_closed(self):
        return self.closed

class Axes:
    def __init__(self):
        self.homed = False
    def home(self):
        self.homed = True
        return "axes homed"

class ToolChanger:
    def __init__(self, tools):
        self.tools, self.current = tools, None
    def load(self, tool):
        if tool not in self.tools:
            raise LookupError(f"tool {tool!r} is not in the carousel")
        self.current = tool
        return f"tool {tool} loaded"

class Spindle:
    def __init__(self):
        self.rpm = 0
    def start(self, rpm):
        self.rpm = rpm
        return f"spindle at {rpm} rpm"
    def stop(self):
        self.rpm = 0
        return "spindle stopped"

class Controller:
    def run(self, program):
        return f"ran {len(program)} lines"

door, axes, changer, spindle, controller = Door(), Axes(), ToolChanger({"T1", "T4"}), Spindle(), Controller()
log = []
if not door.is_closed():
    raise RuntimeError("door open")
if not axes.homed:
    log.append(axes.home())
log.append(changer.load("T4"))
log.append(spindle.start(9000))
log.append(controller.run(["G0 X0", "G1 X50", "G1 Y20"]))
log.append(spindle.stop())
print(log)
```

```output
['axes homed', 'tool T4 loaded', 'spindle at 9000 rpm', 'ran 3 lines', 'spindle stopped']
```

Five calls and two checks across five parts, in a fixed order, and with no protection if the program fails while the spindle is turning. Copied into three places, the copies drift: one forgets to home, another forgets to stop the spindle. The rules of the machine have leaked into every caller.

## A facade

`Machine` holds the parts and offers one method for the common case, `run_job(tool, rpm, program)`. The sequence and its checks are written once. Callers now need to know one method instead of five classes. The parts are still there as attributes for the rare caller, such as a maintenance screen, that needs fine control. Predict before running: does the second job home the axes again?

```python type
class Machine:
    def __init__(self, door, axes, changer, spindle, controller):
        self.door, self.axes, self.changer = door, axes, changer
        self.spindle, self.controller = spindle, controller

    def run_job(self, tool, rpm, program):
        if not self.door.is_closed():
            raise RuntimeError("close the door before starting a job")
        log = []
        if not self.axes.homed:
            log.append(self.axes.home())
        log.append(self.changer.load(tool))
        log.append(self.spindle.start(rpm))
        log.append(self.controller.run(program))
        log.append(self.spindle.stop())
        return log

machine = Machine(Door(), Axes(), ToolChanger({"T1", "T4"}), Spindle(), Controller())
print(machine.run_job("T4", 9000, ["G0 X0", "G1 X50", "G1 Y20"]))
print(machine.run_job("T1", 12000, ["G0 X0", "G1 Y10"]))
print("maintenance can still reach a part:", machine.spindle.rpm)
```

```output
['axes homed', 'tool T4 loaded', 'spindle at 9000 rpm', 'ran 3 lines', 'spindle stopped']
['tool T1 loaded', 'spindle at 12000 rpm', 'ran 2 lines', 'spindle stopped']
maintenance can still reach a part: 0
```

The facade's constructor receives the parts, as in the dependency injection lesson, so a test can hand it fakes.

The second job skips homing, because the facade checks first. Every caller gets that behaviour for free, and a future rule, such as "check coolant before starting", is added in one place. The facade adds no new capability: everything it does, a caller could do with the parts. Its value is that the common path is short and correct by default.

## Thin, not a god object

A facade **coordinates**. It calls the parts in the right order and passes results between them. The real work stays in the parts. A facade that starts computing feeds and speeds itself, or parsing programs, is turning into a **god object**, one class that knows everything, which is the single responsibility lesson's problem again.

Two signs of a healthy facade: each of its methods is short and reads like a recipe of calls, and none of its logic would make sense to test without the parts. Python's standard library is full of facades. `shutil.copytree` coordinates directory listing, file copying and permission setting. `json.dumps` sits in front of an encoder class with many options. `subprocess.run` hides the process-creation machinery behind one call. Each has a lower-level API underneath for the cases the facade does not cover.

## When a step fails

A facade is also the natural place to make a sequence **safe**. If the program fails while the spindle is running, the spindle must still be stopped. `try` ... `finally` guarantees it: the `finally` block runs whether the steps succeed or raise, and the error still reaches the caller afterwards. Predict before running: after the failed job, is the spindle turning, and does the caller see the error?

```python type
class FaultyController:
    def run(self, program):
        if any("G99" in line for line in program):
            raise ValueError("unsupported code G99")
        return f"ran {len(program)} lines"

class SafeMachine(Machine):
    def run_job(self, tool, rpm, program):
        if not self.door.is_closed():
            raise RuntimeError("close the door before starting a job")
        log = []
        if not self.axes.homed:
            log.append(self.axes.home())
        log.append(self.changer.load(tool))
        log.append(self.spindle.start(rpm))
        try:
            log.append(self.controller.run(program))
        finally:
            log.append(self.spindle.stop())
        return log

safe = SafeMachine(Door(), Axes(), ToolChanger({"T1"}), Spindle(), FaultyController())
try:
    safe.run_job("T1", 8000, ["G0 X0", "G99"])
except ValueError as error:
    print("job failed:", error)
print("spindle rpm after the failure:", safe.spindle.rpm)
```

```output
job failed: unsupported code G99
spindle rpm after the failure: 0
```

The controller raised, the `finally` block stopped the spindle anyway, and the error still reached the caller, who can report it. Written once in the facade, this safety applies to every job started through it. Scattered copies of the sequence would each have needed it, and some would have forgotten.

::: challenge A report facade [easy]
Three classes make up a small reporting subsystem: `CsvParser().parse(text)` returns a list of dicts from CSV text with a header row; `Stats().summary(values)` returns a dict with `"count"`, `"mean"`, `"min"` and `"max"`; `Formatter().render(title, summary)` returns the report text. Write a facade function `quick_report(title, csv_text, column)`, which parses the text, takes the named column's values as floats, summarises them and returns the rendered report, so a caller needs one call instead of three classes. If the text has no data rows, return `f"{title}: no data"`.

```python starter
class CsvParser:
    def parse(self, text):
        lines = text.strip().splitlines()
        header = lines[0].split(",")
        return [dict(zip(header, line.split(","))) for line in lines[1:]]

class Stats:
    def summary(self, values):
        return {"count": len(values), "mean": round(sum(values) / len(values), 2), "min": min(values), "max": max(values)}

class Formatter:
    def render(self, title, s):
        return f"{title}: n={s['count']} mean={s['mean']} range={s['min']}-{s['max']}"

def quick_report(title, csv_text, column):
    return ""

print(quick_report("Bench", "id,temp\n1,20.5\n2,23.5\n", "temp"))
```

```python solution
class CsvParser:
    def parse(self, text):
        lines = text.strip().splitlines()
        header = lines[0].split(",")
        return [dict(zip(header, line.split(","))) for line in lines[1:]]

class Stats:
    def summary(self, values):
        return {"count": len(values), "mean": round(sum(values) / len(values), 2), "min": min(values), "max": max(values)}

class Formatter:
    def render(self, title, s):
        return f"{title}: n={s['count']} mean={s['mean']} range={s['min']}-{s['max']}"

def quick_report(title, csv_text, column):
    rows = CsvParser().parse(csv_text)
    if not rows:
        return f"{title}: no data"
    values = [float(row[column]) for row in rows]
    return Formatter().render(title, Stats().summary(values))

print(quick_report("Bench", "id,temp\n1,20.5\n2,23.5\n", "temp"))
```

```python test
assert "quick_report" in dir(), "Keep the function's name as quick_report."
assert quick_report("Bench", "id,temp\n1,20.5\n2,23.5\n", "temp") == "Bench: n=2 mean=22.0 range=20.5-23.5", f"Got {quick_report('Bench', 'id,temp\n1,20.5\n2,23.5\n', 'temp')!r}."
assert quick_report("Press", "id,load,temp\n1,40,30\n2,60,31\n3,50,29\n", "load") == "Press: n=3 mean=50.0 range=40.0-60.0", "Pick the named column, as floats."
assert quick_report("Empty", "id,temp\n", "temp") == "Empty: no data", "A header with no rows gives 'no data'."
_used = []
_real = Formatter.render
def _spy(self, title, s):
    _used.append(title)
    return _real(self, title, s)
Formatter.render = _spy
try:
    quick_report("Spy", "id,temp\n1,5\n", "temp")
finally:
    Formatter.render = _real
assert _used == ["Spy"], "quick_report should use the subsystem's Formatter rather than formatting the text itself."
_seen = []
_real_parse, _real_summary = CsvParser.parse, Stats.summary
CsvParser.parse = lambda self, text: (_seen.append("parse"), _real_parse(self, text))[1]
Stats.summary = lambda self, values: (_seen.append("summary"), _real_summary(self, values))[1]
try:
    quick_report("Spy", "id,temp\n1,5\n", "temp")
finally:
    CsvParser.parse, Stats.summary = _real_parse, _real_summary
assert _seen == ["parse", "summary"], "quick_report should use CsvParser and Stats too, so the facade only coordinates the subsystem."
"SUCCESS: One function hides three classes and the order they must be used in, while the classes stay available for anyone who needs more."
```

Hint: Inside `quick_report`, create a `CsvParser`, `Stats` and `Formatter` and call them in order. Check for an empty list of rows first, and convert the column's values with `float`.
:::

::: challenge A backup facade with cleanup [medium]
A backup takes three steps from three subsystem objects: `archiver.pack(files)` returns a temporary archive name; `uploader.upload(archive)` sends it and returns a remote id (and may raise `ConnectionError`); `archiver.remove(archive)` deletes the temporary archive. Write a class `Backup(archiver, uploader)` with a method `run(files)` that packs, uploads and returns the remote id. Whatever happens, it must **always** remove the temporary archive once it has been packed, including when the upload fails. In that case the `ConnectionError` must still reach the caller. If `files` is empty, return `None` without calling anything.

```python starter
class Backup:
    def __init__(self, archiver, uploader):
        self.archiver, self.uploader = archiver, uploader
    def run(self, files):
        return None

print("write Backup.run")
```

```python solution
class Backup:
    def __init__(self, archiver, uploader):
        self.archiver, self.uploader = archiver, uploader

    def run(self, files):
        if not files:
            return None
        archive = self.archiver.pack(files)
        try:
            return self.uploader.upload(archive)
        finally:
            self.archiver.remove(archive)

print("Backup ready")
```

```python test
assert "Backup" in dir(), "Keep the class name Backup."
class _Archiver:
    def __init__(self):
        self.calls = []
    def pack(self, files):
        self.calls.append(("pack", tuple(files)))
        return "tmp-001.zip"
    def remove(self, archive):
        self.calls.append(("remove", archive))
class _Uploader:
    def __init__(self, fail=False):
        self.fail, self.calls = fail, []
    def upload(self, archive):
        self.calls.append(archive)
        if self.fail:
            raise ConnectionError("network down")
        return "remote-42"
_a, _u = _Archiver(), _Uploader()
assert Backup(_a, _u).run(["a.txt", "b.txt"]) == "remote-42", "A successful backup returns the remote id."
assert _a.calls == [("pack", ("a.txt", "b.txt")), ("remove", "tmp-001.zip")] and _u.calls == ["tmp-001.zip"], f"Pack, upload, then remove; got {_a.calls} and {_u.calls}."
_a, _u = _Archiver(), _Uploader(fail=True)
try:
    Backup(_a, _u).run(["a.txt"])
    assert False, "A failed upload should let the ConnectionError reach the caller."
except ConnectionError:
    pass
assert _a.calls[-1] == ("remove", "tmp-001.zip"), "The temporary archive must be removed even when the upload fails."
_a, _u = _Archiver(), _Uploader()
assert Backup(_a, _u).run([]) is None and _a.calls == [] and _u.calls == [], "Nothing to back up: call nothing, return None."
class _BadArchiver(_Archiver):
    def pack(self, files):
        raise OSError("disk full")
_b = _BadArchiver()
try:
    Backup(_b, _Uploader()).run(["x"])
    assert False, "If packing fails, its error should reach the caller."
except OSError:
    pass
assert _b.calls == [], "If packing failed there is no archive to remove."
"SUCCESS: The facade runs the three steps in order and guarantees the cleanup, so no caller can leave temporary archives behind."
```

Hint: Return `None` early for no files. Pack first (outside any `try`, since there is nothing to clean up if packing fails). Then `try: return self.uploader.upload(archive)` with `finally: self.archiver.remove(archive)`.
:::

::: challenge A safe machine facade [hard]
Write `Cell(door, axes, changer, spindle, coolant, controller)`, a facade over the parts below, with a method `run_job(tool, rpm, program)` that performs exactly this sequence and returns the list of messages the parts returned, in order:

1. if the door is not closed, raise `RuntimeError` and touch nothing else;
2. home the axes if they are not homed;
3. load the tool (the tool changer may raise `LookupError`);
4. turn the coolant on;
5. start the spindle at `rpm`;
6. run the program on the controller;
7. stop the spindle, then turn the coolant off.

If any step from 3 onwards raises, the error must reach the caller, but first everything already started must be stopped: stop the spindle only if it was started, and turn the coolant off only if it was turned on (spindle before coolant). A part whose start call raised counts as not started. Also write `jobs_run`, a read-only property counting the jobs that completed successfully.

```python starter
class Cell:
    def __init__(self, door, axes, changer, spindle, coolant, controller):
        self.door, self.axes, self.changer = door, axes, changer
        self.spindle, self.coolant, self.controller = spindle, coolant, controller

    def run_job(self, tool, rpm, program):
        return []

print("write Cell.run_job and jobs_run")
```

```python solution
class Cell:
    def __init__(self, door, axes, changer, spindle, coolant, controller):
        self.door, self.axes, self.changer = door, axes, changer
        self.spindle, self.coolant, self.controller = spindle, coolant, controller
        self._jobs_run = 0

    @property
    def jobs_run(self):
        return self._jobs_run

    def run_job(self, tool, rpm, program):
        if not self.door.is_closed():
            raise RuntimeError("close the door before starting a job")
        log = []
        if not self.axes.homed:
            log.append(self.axes.home())
        coolant_on = spindle_on = False
        try:
            log.append(self.changer.load(tool))
            log.append(self.coolant.on())
            coolant_on = True
            log.append(self.spindle.start(rpm))
            spindle_on = True
            log.append(self.controller.run(program))
        finally:
            if spindle_on:
                log.append(self.spindle.stop())
            if coolant_on:
                log.append(self.coolant.off())
        self._jobs_run += 1
        return log

print("Cell ready")
```

```python test
assert "Cell" in dir(), "Keep the class name Cell."
_events = []
class _Door:
    def __init__(self, closed=True): self.closed = closed
    def is_closed(self): _events.append("door?"); return self.closed
class _Axes:
    def __init__(self): self.homed = False
    def home(self): _events.append("home"); self.homed = True; return "homed"
class _Changer:
    def load(self, tool):
        _events.append("load")
        if tool == "missing":
            raise LookupError("no such tool")
        return f"loaded {tool}"
class _Spindle:
    def start(self, rpm): _events.append("spin"); return f"spindle {rpm}"
    def stop(self): _events.append("stop"); return "spindle off"
class _Coolant:
    def on(self): _events.append("cool on"); return "coolant on"
    def off(self): _events.append("cool off"); return "coolant off"
class _Ctrl:
    def run(self, program):
        _events.append("run")
        if "G99" in program:
            raise ValueError("bad code")
        return f"ran {len(program)}"
def _cell(closed=True):
    return Cell(_Door(closed), _Axes(), _Changer(), _Spindle(), _Coolant(), _Ctrl())
_c = _cell()
assert _c.run_job("T1", 9000, ["G1"]) == ["homed", "loaded T1", "coolant on", "spindle 9000", "ran 1", "spindle off", "coolant off"], "The full sequence, in order."
assert _c.run_job("T2", 5000, ["G1", "G2"]) == ["loaded T2", "coolant on", "spindle 5000", "ran 2", "spindle off", "coolant off"], "Already homed: no homing the second time."
assert _c.jobs_run == 2, "Two jobs completed."
try:
    _c.jobs_run = 0
    assert False, "jobs_run should be read-only."
except AttributeError:
    pass
_events.clear()
try:
    _cell(closed=False).run_job("T1", 1, [])
    assert False, "An open door should raise RuntimeError."
except RuntimeError:
    pass
assert _events == ["door?"], f"With the door open, touch nothing else; got {_events}."
_events.clear()
_c2 = _cell()
try:
    _c2.run_job("T1", 8000, ["G0", "G99"])
    assert False, "A failing program should raise."
except ValueError:
    pass
assert _events[-2:] == ["stop", "cool off"], f"After a program error, stop the spindle then the coolant; got {_events}."
assert _c2.jobs_run == 0, "A failed job is not counted."
_events.clear()
try:
    _cell().run_job("missing", 8000, ["G0"])
    assert False, "A missing tool should raise LookupError."
except LookupError:
    pass
assert "stop" not in _events and "cool off" not in _events and "spin" not in _events, f"If loading the tool fails, nothing was started, so nothing is stopped; got {_events}."
class _BadSpindle(_Spindle):
    def start(self, rpm): _events.append("spin"); raise RuntimeError("drive fault")
_events.clear()
try:
    Cell(_Door(), _Axes(), _Changer(), _BadSpindle(), _Coolant(), _Ctrl()).run_job("T1", 100, ["G0"])
    assert False, "A spindle fault should raise."
except RuntimeError:
    pass
assert "stop" not in _events and _events[-1] == "cool off", f"The spindle never started, so only the coolant is turned off; got {_events}."
"SUCCESS: One call runs the whole job in the right order, and whatever fails, everything that was started is stopped and the error still reaches the caller."
```

Hint: Check the door first. Keep two flags, `coolant_on` and `spindle_on`, set to True just after each part starts successfully. Put steps 3 to 6 in a `try` whose `finally` stops the spindle if `spindle_on` and then turns off the coolant if `coolant_on`. Count the job only after the `try` completes without an exception.
:::

## What you learned

- A facade is a simple front for a complicated subsystem: it packages the common sequence of calls, with its order and checks, into one method or function.
- It does not hide or replace the subsystem. Callers needing fine control still use the parts directly.
- A facade coordinates and stays thin. If it starts doing the parts' work itself, it is becoming a god object.
- The facade is the natural place to make a sequence safe: `try`/`finally` stops what was started, in the right order, while still letting the error reach the caller.

The next lesson treats single objects and groups of objects through the same interface: the composite pattern, for trees of parts.
