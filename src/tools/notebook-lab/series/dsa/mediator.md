# Mediator

A production cell has a conveyor, a robot, a press and an inspection camera. When a part arrives, the robot should load the press; when the press finishes, the robot should unload it to the camera; when the camera passes the part, the conveyor should take it away, and if it fails, the robot should drop it in the reject bin. If each machine talks directly to the others, every machine needs to know about the rest. With n components that can be up to n × (n − 1) connections, and the cell's overall sequence is scattered across all of them: no single place says how the cell works.

The **mediator** pattern puts one object in the middle. Components report to the mediator ("a part arrived", "press cycle done") and the mediator tells components what to do. Components know only the mediator; the mediator knows the components and holds the coordination logic. The sequence of the cell becomes one readable piece of code.

This lesson covers:

- the problem: components wired to each other, and the sequence spread across them;
- a mediator that receives events and directs components;
- how a mediator differs from an observer's event bus;
- the risk: a mediator that grows into a god object.

## The problem: everyone knows everyone

Here the components call each other directly. Predict before reading on: to add a second press that alternates with the first, which classes must change?

```python type
class Conveyor:
    def __init__(self):
        self.robot, self.log = None, []
    def part_arrives(self, part):
        self.log.append(f"conveyor: {part} arrived")
        self.robot.load_press(part)
    def take_away(self, part):
        self.log.append(f"conveyor: {part} out")

class Robot:
    def __init__(self, log):
        self.press = self.camera = self.conveyor = None
        self.log = log
    def load_press(self, part):
        self.log.append(f"robot: {part} -> press")
        self.press.cycle(part)
    def unload_to_camera(self, part):
        self.log.append(f"robot: {part} -> camera")
        self.camera.inspect(part)

class Press:
    def __init__(self, log):
        self.robot, self.log = None, log
    def cycle(self, part):
        self.log.append(f"press: pressed {part}")
        self.robot.unload_to_camera(part)

class Camera:
    def __init__(self, log):
        self.conveyor, self.log = None, log
    def inspect(self, part):
        self.log.append(f"camera: {part} OK")
        self.conveyor.take_away(part)

conveyor = Conveyor()
robot, press, camera = Robot(conveyor.log), Press(conveyor.log), Camera(conveyor.log)
conveyor.robot, robot.press, robot.camera, press.robot, camera.conveyor = robot, press, camera, robot, conveyor
conveyor.part_arrives("P1")
print(conveyor.log)
```

```output
['conveyor: P1 arrived', 'robot: P1 -> press', 'press: pressed P1', 'robot: P1 -> camera', 'camera: P1 OK', 'conveyor: P1 out']
```

Five wiring assignments for four machines, and every class names others. The cell's sequence (load, press, unload, inspect, take away) exists only as a chain of calls hidden in four classes. A second press touches the robot (which press to load?) and the press (which robot unloads it?), and changing the order of operations means editing several machines. None can be tested alone without stand-ins for its neighbours.

## A mediator

Give the machines one contact: the cell controller. Each machine does its own job and **reports** to the controller (`controller.notify(self, event, part)`). The controller decides what happens next and gives orders. The machines no longer know each other, and the sequence lives in one method. Predict before running: what happens to the failed part, and which class decided that?

```python type
class Machine:
    def __init__(self, name, controller):
        self.name, self.controller = name, controller
    def report(self, event, part):
        self.controller.notify(self, event, part)

class Press(Machine):
    def cycle(self, part):
        self.controller.log.append(f"{self.name}: pressed {part}")
        self.report("pressed", part)

class Camera(Machine):
    def inspect(self, part):
        ok = not part.endswith("x")
        self.controller.log.append(f"{self.name}: {part} {'OK' if ok else 'FAIL'}")
        self.report("passed" if ok else "failed", part)

class CellController:
    def __init__(self):
        self.log = []
        self.press = Press("press", self)
        self.camera = Camera("camera", self)
        self.done, self.rejects = [], []

    def notify(self, sender, event, part):
        if event == "arrived":
            self.log.append(f"robot: {part} -> press")
            self.press.cycle(part)
        elif event == "pressed":
            self.log.append(f"robot: {part} -> camera")
            self.camera.inspect(part)
        elif event == "passed":
            self.done.append(part)
        elif event == "failed":
            self.log.append(f"robot: {part} -> reject bin")
            self.rejects.append(part)

cell = CellController()
for part in ["P1", "P2x", "P3"]:
    cell.notify(None, "arrived", part)
print("\n".join(cell.log))
print("done:", cell.done, " rejects:", cell.rejects)
```

```output
robot: P1 -> press
press: pressed P1
robot: P1 -> camera
camera: P1 OK
robot: P2x -> press
press: pressed P2x
robot: P2x -> camera
camera: P2x FAIL
robot: P2x -> reject bin
robot: P3 -> press
press: pressed P3
robot: P3 -> camera
camera: P3 OK
done: ['P1', 'P3']  rejects: ['P2x']
```

The press and the camera each know only `self.controller`. Neither knows the other exists, or that a robot exists.

The failed part goes to the reject bin, and that decision is in `CellController.notify`, which now reads as the cell's whole process from arrival to finish. A second press, or a different routing for failed parts, is a change to that one method. Each machine can be tested with a stand-in controller that has a `log` list and just records its reports.

## Mediator or event bus?

The observer lesson's event bus also sits in the middle, so what is the difference? It is where the **decisions** live.

- An **event bus** only routes: it delivers each event to whoever subscribed, and knows nothing about what should happen. The logic is spread among the subscribers, each reacting on its own.
- A **mediator** decides: it receives a report and chooses what happens next. The logic is concentrated in it.

Choose by what you want to read in one place. If the components are independent reactions to events (log it, chart it, alert someone), a bus keeps them decoupled. If they are steps in one coordinated process whose order matters, as in the cell, a mediator makes that process explicit. Air traffic control is the classic picture: aircraft do not negotiate with each other, they all talk to the tower.

## Keeping the mediator from becoming a god object

All the coordination flows into the mediator, so it can grow into exactly the god object the facade lesson warned about. Three habits keep it healthy:

- the mediator **coordinates** and the components **work**: the press presses, the camera judges; the mediator only decides who acts next;
- split mediators by process: a cell controller per cell, not one controller for the whole factory;
- when the coordination is mostly "in state X, event Y means do Z", write it as a **table** or a state machine (the state lesson) inside the mediator, rather than a growing `if`/`elif`.

Here the cell controller's routing becomes a table from event to action, so adding a step is adding a row. Predict before running: how many lines change to add a "label" step after a part passes?

```python type
class TableCell(CellController):
    def __init__(self):
        super().__init__()
        self.labelled = []
        self.routes = {
            "arrived": lambda part: (self.log.append(f"robot: {part} -> press"), self.press.cycle(part)),
            "pressed": lambda part: (self.log.append(f"robot: {part} -> camera"), self.camera.inspect(part)),
            "passed": lambda part: (self.labelled.append(part), self.done.append(part)),
            "failed": lambda part: (self.log.append(f"robot: {part} -> reject bin"), self.rejects.append(part)),
        }
    def notify(self, sender, event, part):
        self.routes[event](part)

cell = TableCell()
for part in ["Q1", "Q2", "Q3x"]:
    cell.notify(None, "arrived", part)
print("labelled:", cell.labelled, " done:", cell.done, " rejects:", cell.rejects)
```

```output
labelled: ['Q1', 'Q2']  done: ['Q1', 'Q2']  rejects: ['Q3x']
```

Each route is a small function. A tuple of calls inside a lambda runs both calls in order: a compact trick for short actions, though a named method is clearer for anything longer.

The labelling step is one new list and one change to the `"passed"` row. The routes table is the cell's process laid out flat, which is the mediator at its most readable.

::: challenge A control room [easy]
Operators in a control room send messages through a `ControlRoom` mediator, never directly to each other. Write `ControlRoom` with `join(operator)` and `send(sender, text, to=None)`, and `Operator(name)` with a `room` attribute (set by `join`), an `inbox` list, and `say(text, to=None)`, which calls `self.room.send(self, text, to)` and returns its result. A message with `to=None` is delivered to every other operator in the room (not the sender) as `f"{sender.name}: {text}"`. A message with `to` set to an operator's name goes only to that operator, as `f"{sender.name} (private): {text}"`, and raises `KeyError` if no operator by that name is in the room. `send` returns the number of operators the message was delivered to.

```python starter
class Operator:
    def __init__(self, name):
        self.name, self.inbox, self.room = name, [], None

print("write ControlRoom and Operator.say")
```

```python solution
class Operator:
    def __init__(self, name):
        self.name, self.inbox, self.room = name, [], None
    def say(self, text, to=None):
        return self.room.send(self, text, to)

class ControlRoom:
    def __init__(self):
        self._operators = {}
    def join(self, operator):
        self._operators[operator.name] = operator
        operator.room = self
    def send(self, sender, text, to=None):
        if to is not None:
            self._operators[to].inbox.append(f"{sender.name} (private): {text}")
            return 1
        count = 0
        for operator in self._operators.values():
            if operator is not sender:
                operator.inbox.append(f"{sender.name}: {text}")
                count += 1
        return count

room = ControlRoom()
ana, ben = Operator("Ana"), Operator("Ben")
room.join(ana); room.join(ben)
ana.say("press 2 is down")
print(ben.inbox)
```

```python test
for _n in ["ControlRoom", "Operator"]:
    assert _n in dir(), f"Define {_n}."
_room = ControlRoom()
_a, _b, _c = Operator("Ana"), Operator("Ben"), Operator("Cy")
for _o in (_a, _b, _c):
    _room.join(_o)
assert _a.room is _room, "join sets the operator's room."
assert _a.say("press 2 is down") == 2, "A broadcast reaches the two others."
assert _b.inbox == ["Ana: press 2 is down"] and _c.inbox == ["Ana: press 2 is down"] and _a.inbox == [], "Everyone else gets it; the sender doesn't."
assert _b.say("on my way", to="Ana") == 1 and _a.inbox == ["Ben (private): on my way"] and _c.inbox == ["Ana: press 2 is down"], "A private message reaches only its target."
try:
    _a.say("hello?", to="Zed")
    assert False, "A private message to someone not in the room should raise KeyError."
except KeyError:
    pass
_solo_room = ControlRoom(); _solo = Operator("Solo"); _solo_room.join(_solo)
assert _solo.say("anyone?") == 0, "Alone in a room, a broadcast reaches nobody."
assert not any(isinstance(_v, Operator) for _o in (_a, _b) for _k, _v in vars(_o).items() if _k != "room"), "Operators should hold only the room, never other operators."
"SUCCESS: Operators talk only to the room, so adding an operator or a new kind of message changes one class, not every operator."
```

Hint: The room keeps a dict of operators by name. `join` stores the operator and sets `operator.room = self`. `send` delivers to the named operator for a private message, or loops over everyone except the sender, counting deliveries.
:::

::: challenge A form whose fields depend on each other [medium]
An order form has three widgets that affect each other: an `express` checkbox, a `country` choice and a `postcode` field. The rules: express delivery is only available to `"UK"`; the postcode field is required (and enabled) only for `"UK"`; choosing a non-UK country must also untick express and clear the postcode. Write a `Widget(name, mediator)` base class with `value`, `enabled` (True at first) and `set(value)`, which stores the value and calls `mediator.changed(self)`. Then write `OrderForm`, the mediator, which creates the three widgets in its constructor as attributes `express` (value False), `country` (value `"UK"`) and `postcode` (value `""`), and whose `changed(widget)` applies the rules. It must not call `set` while handling a change (to avoid endless loops), only assign attributes directly. Also give `OrderForm` a method `valid()`: True when the postcode is non-empty if required, and express is ticked only if allowed.

```python starter
class Widget:
    def __init__(self, name, mediator):
        self.name, self.mediator = name, mediator
        self.value, self.enabled = None, True

print("write Widget.set and OrderForm")
```

```python solution
class Widget:
    def __init__(self, name, mediator):
        self.name, self.mediator = name, mediator
        self.value, self.enabled = None, True
    def set(self, value):
        self.value = value
        self.mediator.changed(self)

class OrderForm:
    def __init__(self):
        self.express = Widget("express", self)
        self.country = Widget("country", self)
        self.postcode = Widget("postcode", self)
        self.express.value, self.country.value, self.postcode.value = False, "UK", ""
        self.changed(self.country)

    def changed(self, widget):
        uk = self.country.value == "UK"
        self.express.enabled = uk
        self.postcode.enabled = uk
        if not uk:
            self.express.value = False
            self.postcode.value = ""

    def valid(self):
        uk = self.country.value == "UK"
        if uk and not self.postcode.value:
            return False
        if self.express.value and not uk:
            return False
        return True

form = OrderForm()
form.express.set(True); form.country.set("FR")
print(form.express.value, form.express.enabled, form.postcode.enabled, form.valid())
```

```python test
for _n in ["Widget", "OrderForm"]:
    assert _n in dir(), f"Define {_n}."
_f = OrderForm()
assert (_f.express.value, _f.country.value, _f.postcode.value) == (False, "UK", ""), "Starting values."
assert _f.express.enabled and _f.postcode.enabled, "For the UK, express and postcode are available."
assert not _f.valid(), "A UK order needs a postcode."
_f.postcode.set("SW1A 1AA"); _f.express.set(True)
assert _f.valid() and _f.express.value is True, "A UK order with a postcode and express is valid."
_f.country.set("FR")
assert _f.express.value is False and not _f.express.enabled and not _f.postcode.enabled and _f.postcode.value == "", "Choosing France unticks and disables express and clears and disables the postcode."
assert _f.valid(), "A French order needs no postcode."
_f.country.set("UK")
assert _f.express.enabled and _f.postcode.enabled and _f.express.value is False and not _f.valid(), "Back to the UK: enabled again, but the postcode must be re-entered."
_calls = []
class _Spy(Widget):
    def set(self, value):
        _calls.append(self.name)
        super().set(value)
_g = OrderForm()
_g.express.__class__ = _Spy; _g.postcode.__class__ = _Spy; _g.country.__class__ = _Spy
_g.country.set("DE")
assert _calls == ["country"], f"While handling a change, the form must assign directly, not call set (which would notify again); set was called for {_calls}."
"SUCCESS: The widgets only report changes, and all the rules about which fields depend on which live in the form."
```

Hint: In `OrderForm.__init__`, create the widgets, set their starting values directly, and apply the rules once. `changed` works out whether the country is the UK and sets `enabled` and (when not UK) `value` on the other widgets directly. `valid` checks the two conditions.
:::

::: challenge A production cell controller [hard]
Write `Cell`, a mediator coordinating three component objects, which it creates in its constructor and which report back to it by calling `cell.notify(event, part)`:

- `Press(cell)` with `load(part)`: logs `f"press {part}"` to `cell.log`, then reports `"pressed"`;
- `Camera(cell, fail_marks)` with `inspect(part)`: reports `"failed"` if any string in `fail_marks` appears in the part name, else `"passed"`, after logging `f"inspect {part}"`;
- `ReworkStation(cell)` with `rework(part)`: logs `f"rework {part}"` and reports `"reworked"`, giving the part the new name `part + "-R"`.

The cell's process, all in `Cell.notify`: `"arrived"` → load the press; `"pressed"` → inspect; `"passed"` → append to `cell.shipped`; a part that `"failed"` goes to rework if it has not been reworked yet (its name does not end in `"-R"`), otherwise to `cell.scrapped`; `"reworked"` → load the press again (the reworked part goes round once more). An unknown event raises `ValueError`. Store them as `cell.press`, `cell.camera` and `cell.rework`; each component keeps the cell as `self.cell`. Components must not reference each other. `Cell(fail_marks=("x",))` should set up the camera with those marks, and `cell.run(parts)` sends `"arrived"` for each part in turn and returns `(shipped, scrapped)`.

```python starter
class Cell:
    def __init__(self, fail_marks=("x",)):
        self.log, self.shipped, self.scrapped = [], [], []
    def run(self, parts):
        return self.shipped, self.scrapped

print(Cell().run(["A1"]))
```

```python solution
class Press:
    def __init__(self, cell):
        self.cell = cell
    def load(self, part):
        self.cell.log.append(f"press {part}")
        self.cell.notify("pressed", part)

class Camera:
    def __init__(self, cell, fail_marks):
        self.cell, self.fail_marks = cell, fail_marks
    def inspect(self, part):
        self.cell.log.append(f"inspect {part}")
        failed = any(mark in part for mark in self.fail_marks)
        self.cell.notify("failed" if failed else "passed", part)

class ReworkStation:
    def __init__(self, cell):
        self.cell = cell
    def rework(self, part):
        self.cell.log.append(f"rework {part}")
        self.cell.notify("reworked", part + "-R")

class Cell:
    def __init__(self, fail_marks=("x",)):
        self.log, self.shipped, self.scrapped = [], [], []
        self.press = Press(self)
        self.camera = Camera(self, fail_marks)
        self.rework = ReworkStation(self)

    def notify(self, event, part):
        if event in ("arrived", "reworked"):
            self.press.load(part)
        elif event == "pressed":
            self.camera.inspect(part)
        elif event == "passed":
            self.shipped.append(part)
        elif event == "failed":
            if part.endswith("-R"):
                self.scrapped.append(part)
            else:
                self.rework.rework(part)
        else:
            raise ValueError(f"unknown event {event!r}")

    def run(self, parts):
        for part in parts:
            self.notify("arrived", part)
        return self.shipped, self.scrapped

print(Cell(fail_marks=("x",)).run(["A1", "A2x", "A3"]))
```

```python test
for _n in ["Press", "Camera", "ReworkStation", "Cell"]:
    assert _n in dir(), f"Define {_n}."
for _cls in [Press, Camera, ReworkStation]:
    assert "cell" in _cls.__init__.__code__.co_varnames, f"Define {_cls.__name__} for this challenge, taking the cell (the lesson's demo has a different {_cls.__name__})."
_c = Cell(fail_marks=("x",))
assert _c.run(["A1", "A2", "A3"]) == (["A1", "A2", "A3"], []), "Good parts are all shipped."
assert _c.log[:2] == ["press A1", "inspect A1"], f"Each part is pressed then inspected; log starts {_c.log[:2]}."
_c = Cell(fail_marks=("x",))
_shipped, _scrapped = _c.run(["B1x", "B2"])
assert _shipped == ["B2"] and _scrapped == ["B1x-R"], f"B1x fails, is reworked to B1x-R, fails again (it still contains x) and is scrapped; got {_shipped}, {_scrapped}."
assert _c.log == ["press B1x", "inspect B1x", "rework B1x", "press B1x-R", "inspect B1x-R", "press B2", "inspect B2"], f"Got {_c.log}."
_c = Cell(fail_marks=("dent",))
assert _c.run(["C1dent", "C2"]) == (["C2"], ["C1dent-R"]), "Fail marks come from the constructor."
class _FixingCamera(Camera):
    def inspect(self, part):
        self.cell.log.append(f"inspect {part}")
        self.cell.notify("passed" if part.endswith("-R") or "x" not in part else "failed", part)
_d = Cell()
_d.camera = _FixingCamera(_d, ("x",))
assert _d.run(["D1x"]) == (["D1x-R"], []), "A reworked part that passes is shipped."
try:
    Cell().notify("exploded", "E1")
    assert False, "An unknown event should raise ValueError."
except ValueError:
    pass
for _comp in (_c.press, _c.camera, _c.rework):
    _others = [_v for _k, _v in vars(_comp).items() if isinstance(_v, (Press, Camera, ReworkStation))]
    assert not _others, f"{type(_comp).__name__} should know only the cell, not other components."
"SUCCESS: The press, camera and rework station each do one job and report to the cell, and the whole process, rework loop included, reads in one method."
```

Hint: Each component stores the cell and, after doing its job, calls `self.cell.notify(event, part)`. `Cell.__init__` creates the three components, passing `self`. `notify` is a chain of `if`/`elif` on the event (or a dict of handlers), raising `ValueError` at the end; `run` notifies `"arrived"` for each part.
:::

## What you learned

- When many components would talk to each other directly, the links multiply and the overall process is scattered across them.
- A mediator sits in the middle: components report to it and receive orders from it, knowing nothing of each other, and the coordination logic lives in one place.
- An event bus only routes events to subscribers, while a mediator decides what happens next. Choose the bus for independent reactions, the mediator for a coordinated process whose order matters.
- Keep the mediator thin: it coordinates and the components work. Split mediators by process, and write the coordination as a table or state machine when it grows.

The next lesson saves and restores an object's state without exposing its internals: the memento pattern.
