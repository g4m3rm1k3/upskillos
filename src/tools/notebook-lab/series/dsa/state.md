# State

Many objects behave differently depending on what mode they are in. A machine that is idle starts when you press start; one that is running ignores start but pauses when you press pause; one in a fault condition refuses everything until it is reset. The obvious code keeps a mode variable and checks it in every method, and as modes and events are added, every method grows into a thicket of `if` statements, all of which must agree about which moves are legal.

The **state** pattern gives each mode its own object. The object holding the mode (the **context**) delegates each event to its current state object, which decides what happens and which state comes next. All the behaviour of one mode lives in one class, and adding a mode means adding a class. In Python, the lightest form of the same idea is often a **transition table**: a dictionary saying, for each state and event, which state comes next.

This lesson covers:

- the problem: one mode variable checked in every method;
- states as data: a transition table, and a finite-state machine that rejects illegal events;
- states as objects, when each mode also has its own behaviour;
- entry and exit actions, which keep the work of changing state in one place.

## The problem: a mode checked everywhere

A machine controller has a `mode` string and methods for each button. Each method checks the mode. Predict before reading on: if a "fault" mode is added, how many methods change, and what stops someone forgetting one?

```python type
class Controller:
    def __init__(self):
        self.mode = "idle"
    def start(self):
        if self.mode == "idle":
            self.mode = "running"
        elif self.mode == "paused":
            raise ValueError("use resume to continue a paused job")
        elif self.mode == "running":
            pass
    def pause(self):
        if self.mode == "running":
            self.mode = "paused"
        elif self.mode in ("idle", "paused"):
            raise ValueError(f"cannot pause when {self.mode}")
    def resume(self):
        if self.mode == "paused":
            self.mode = "running"
        else:
            raise ValueError(f"cannot resume when {self.mode}")
    def stop(self):
        self.mode = "idle"

c = Controller()
c.start(); c.pause(); c.resume(); c.stop()
print("final mode:", c.mode)
c.mode = "runing"
c.start()
print("after a typo, start did nothing; mode =", c.mode)
```

```output
final mode: idle
after a typo, start did nothing; mode = runing
```

Every method contains its own picture of all the modes, and they already disagree. Starting while running silently does nothing, while pausing while idle raises. A fault mode means editing all four methods. And the mode is a plain string: the typo `"runing"` makes the controller stuck in a mode no method knows, with no error at all. The rules about which moves are legal (the most important thing about the machine) are spread across every method and written down nowhere as a whole.

## States as data: a transition table

Write the rules down in one place. A **finite-state machine** has a fixed set of states, a fixed set of events, and a table saying, for each `(state, event)` pair, which state comes next. Any pair missing from the table is an illegal move. The table **is** the specification: it can be printed, checked and tested on its own. Predict before running: which event in the sequence is rejected, and what state is the machine left in?

```python type
TRANSITIONS = {
    ("idle", "start"): "running",
    ("running", "pause"): "paused",
    ("paused", "resume"): "running",
    ("running", "stop"): "idle",
    ("paused", "stop"): "idle",
    ("idle", "fault"): "fault",
    ("running", "fault"): "fault",
    ("paused", "fault"): "fault",
    ("fault", "reset"): "idle",
}

class StateMachine:
    def __init__(self, table, start):
        self.table, self.state = table, start
        self.history = [start]
    def handle(self, event):
        key = (self.state, event)
        if key not in self.table:
            raise ValueError(f"'{event}' is not allowed when {self.state}")
        self.state = self.table[key]
        self.history.append(self.state)

m = StateMachine(TRANSITIONS, "idle")
for event in ["start", "pause", "resume", "fault", "start", "reset", "start"]:
    try:
        m.handle(event)
    except ValueError as error:
        print("rejected:", error)
print(" -> ".join(m.history))
states = sorted({s for s, _ in TRANSITIONS} | set(TRANSITIONS.values()))
print("states:", states, " events allowed when idle:", sorted(e for s, e in TRANSITIONS if s == "idle"))
```

```output
rejected: 'start' is not allowed when fault
idle -> running -> paused -> running -> fault -> idle -> running
states: ['fault', 'idle', 'paused', 'running']  events allowed when idle: ['fault', 'start']
```

Because the table is data, the program can answer questions about it: which states exist, and which events are allowed in a given state. That is how a user interface could grey out buttons that do nothing right now.

`start` while in fault is rejected, and the machine stays in fault until `reset`. Adding the fault mode was four new lines in the table and no change to any code. When the states differ only in **which moves are legal**, a table is the whole solution, and it is usually the right one in Python.

## States as objects

Often each state also **behaves** differently, beyond deciding the next state. A label printer accepts jobs in every mode, but what happens to a job depends on the mode: an idle printer prints it at once, a busy one queues it, a jammed one holds it and reports the jam. Now each state needs its own code. The state pattern gives each state a class with a method per event. The context, the `Printer`, holds the current state object and passes each event to it, and the state does the work and switches the context to the next state. Predict before running: in what order are the three jobs printed?

```python type
class Idle:
    def submit(self, printer, job):
        printer.start(job)
    def finish(self, printer):
        raise ValueError("nothing is printing")
    def jam(self, printer):
        raise ValueError("an idle printer cannot jam")
    def clear(self, printer):
        pass

class Printing:
    def submit(self, printer, job):
        printer.queue.append(job)
    def finish(self, printer):
        printer.done.append(printer.current)
        printer.current = None
        if printer.queue:
            printer.start(printer.queue.pop(0))
        else:
            printer.state = Idle()
    def jam(self, printer):
        printer.state = Jammed()
    def clear(self, printer):
        pass

class Jammed:
    def submit(self, printer, job):
        printer.queue.append(job)
        printer.messages.append(f"jammed: {job} is waiting")
    def finish(self, printer):
        raise ValueError("clear the jam first")
    def jam(self, printer):
        pass
    def clear(self, printer):
        printer.state = Printing()

class Printer:
    def __init__(self):
        self.state = Idle()
        self.queue, self.done, self.messages = [], [], []
        self.current = None
    def start(self, job):
        self.current = job
        self.state = Printing()
    def submit(self, job):
        self.state.submit(self, job)
    def finish(self):
        self.state.finish(self)
    def jam(self):
        self.state.jam(self)
    def clear(self):
        self.state.clear(self)

p = Printer()
p.submit("label A"); p.submit("label B"); p.jam(); p.submit("label C")
p.clear(); p.finish(); p.finish(); p.finish()
print("printed:", p.done, " state:", type(p.state).__name__, " messages:", p.messages)
```

```output
printed: ['label A', 'label B', 'label C']  state: Idle  messages: ['jammed: label C is waiting']
```

`Printer`'s methods contain no `if` on the mode at all: each just hands the event to its state. Everything a jammed printer does is in `Jammed`, and nowhere else.

Label A prints first. B and C are queued (C while the printer was jammed, with a message), and after the jam is cleared they print in the order they arrived. The printer ends idle. A new state such as `OutOfLabels` would be one new class: every other state stays untouched.

## Entry and exit actions

Changing state often comes with work: starting a running state turns the spindle on, leaving it turns the spindle off, entering a fault state raises an alarm. If those actions are attached to **transitions** (to each event that can lead somewhere), they get copied: every route into the running state must remember to start the spindle. Attaching them to the **states** instead, as **entry** and **exit** actions, means each is written once. One `transition_to` method calls the old state's exit action, switches, then calls the new state's entry action, whatever event caused the change. Predict before running: how many times is the spindle switched on and off?

```python type
class State:
    name = "?"
    def enter(self, machine): pass
    def exit(self, machine): pass

class IdleState(State):
    name = "idle"

class RunningState(State):
    name = "running"
    def enter(self, machine):
        machine.log.append("spindle on")
    def exit(self, machine):
        machine.log.append("spindle off")

class FaultState(State):
    name = "fault"
    def enter(self, machine):
        machine.log.append("ALARM")

class Machine:
    TABLE = {("idle", "start"): RunningState, ("running", "stop"): IdleState,
             ("running", "fault"): FaultState, ("idle", "fault"): FaultState, ("fault", "reset"): IdleState}
    def __init__(self):
        self.state, self.log = IdleState(), []
    def handle(self, event):
        next_class = self.TABLE.get((self.state.name, event))
        if next_class is None:
            raise ValueError(f"'{event}' is not allowed when {self.state.name}")
        self.transition_to(next_class())
    def transition_to(self, new_state):
        self.state.exit(self)
        self.log.append(f"{self.state.name} -> {new_state.name}")
        self.state = new_state
        new_state.enter(self)

m = Machine()
for event in ["start", "stop", "start", "fault", "reset"]:
    m.handle(event)
print(m.log)
```

```output
['idle -> running', 'spindle on', 'spindle off', 'running -> idle', 'idle -> running', 'spindle on', 'spindle off', 'running -> fault', 'ALARM', 'fault -> idle']
```

This version combines both ideas: a table decides **which** state comes next, and state objects decide what happens on the way in and out.

The spindle is switched on twice and off twice, including the second time, when the run ended in a fault rather than a stop: the exit action runs whatever the event. Forgetting to stop the spindle on the fault route is now impossible, because no route has to remember it.

::: challenge A transition table for a door interlock [easy]
A machine's guard door has four states: `"closed"`, `"open"`, `"locked"` and `"forced"`. Write the dict `DOOR`, mapping `(state, event)` to the next state, with exactly these moves: from `"closed"`, `"open"` goes to `"open"` and `"lock"` to `"locked"`; from `"open"`, `"close"` goes to `"closed"`; from `"locked"`, `"unlock"` goes to `"closed"` and `"force"` to `"forced"`; from `"forced"`, `"repair"` goes to `"closed"`. Then write `run(table, start, events)`, returning the list of states visited, starting with `start`. An event not allowed in the current state raises `ValueError` naming the event and the state. Also write `allowed(table, state)`, returning the sorted list of events allowed in a state.

```python starter
DOOR = {}

def run(table, start, events):
    return [start]

print(run(DOOR, "closed", ["open", "close"]))
```

```python solution
DOOR = {
    ("closed", "open"): "open",
    ("closed", "lock"): "locked",
    ("open", "close"): "closed",
    ("locked", "unlock"): "closed",
    ("locked", "force"): "forced",
    ("forced", "repair"): "closed",
}

def run(table, start, events):
    state, visited = start, [start]
    for event in events:
        if (state, event) not in table:
            raise ValueError(f"'{event}' is not allowed when {state}")
        state = table[(state, event)]
        visited.append(state)
    return visited

def allowed(table, state):
    return sorted(event for s, event in table if s == state)

print(run(DOOR, "closed", ["open", "close", "lock", "unlock"]))
```

```python test
for _n in ["DOOR", "run", "allowed"]:
    assert _n in dir(), f"Define {_n}."
assert len(DOOR) == 6 and DOOR[("locked", "force")] == "forced" and DOOR[("forced", "repair")] == "closed", "DOOR should have exactly the six moves described."
assert run(DOOR, "closed", ["open", "close", "lock", "unlock"]) == ["closed", "open", "closed", "locked", "closed"], "A normal cycle."
assert run(DOOR, "closed", []) == ["closed"], "No events: just the start."
for _start, _events, _bad in [("closed", ["lock", "open"], "open"), ("open", ["lock"], "lock"), ("forced", ["unlock"], "unlock")]:
    try:
        run(DOOR, _start, _events)
        assert False, f"{_bad!r} should be rejected."
    except ValueError as _e:
        assert _bad in str(_e), f"Name the rejected event in the error; got {_e}."
assert allowed(DOOR, "locked") == ["force", "unlock"] and allowed(DOOR, "open") == ["close"] and allowed(DOOR, "nowhere") == [], "allowed lists the events possible in a state."
_tiny = {("a", "go"): "b", ("b", "go"): "a"}
assert run(_tiny, "a", ["go"] * 3) == ["a", "b", "a", "b"], "run should work with any table."
"SUCCESS: The door's rules live in one table that the program can run, check and query, with every illegal move rejected."
```

Hint: `DOOR` is a dict literal with tuple keys. `run` keeps the current state, checks `(state, event) in table` for each event, and appends each new state. `allowed` filters the keys whose state matches and sorts their events.
:::

::: challenge A vending machine with state objects [medium]
Write a parts vending machine (for gloves, earplugs and other consumables) using the state pattern. The context, `Vendor(price)`, holds `self.state`, a `credit` in pence and a list `dispensed`, and offers `insert(coins)`, `select()` and `refund()`, each delegating to the current state object. There are three state classes:

- `Waiting` (the starting state): `insert` adds to credit and moves to `HasCredit`; `select` raises `ValueError`; `refund` returns 0;
- `HasCredit`: `insert` adds to credit; `select` dispenses one item (appending `"item"` to `dispensed`) if credit ≥ price, subtracts the price, and moves to `Waiting` when no credit remains (otherwise stays), and raises `ValueError` if credit is short; `refund` returns all credit, sets it to 0 and moves to `Waiting`;
- `SoldOut`: `insert` raises `ValueError`; `select` raises `ValueError`; `refund` returns all credit (0 or more) and sets it to 0.

The context also has `stock`, the number of items left (a constructor argument, default 10). When a sale empties the stock, the machine moves to `SoldOut`. `Vendor` methods must not check the state's type: each just delegates.

```python starter
class Vendor:
    def __init__(self, price, stock=10):
        self.price, self.stock = price, stock
        self.credit, self.dispensed = 0, []

print("write the states and Vendor")
```

```python solution
class Waiting:
    def insert(self, v, coins):
        v.credit += coins
        v.state = HasCredit()
    def select(self, v):
        raise ValueError("insert coins first")
    def refund(self, v):
        return 0

class HasCredit:
    def insert(self, v, coins):
        v.credit += coins
    def select(self, v):
        if v.credit < v.price:
            raise ValueError(f"insert {v.price - v.credit}p more")
        v.credit -= v.price
        v.stock -= 1
        v.dispensed.append("item")
        if v.stock == 0:
            v.state = SoldOut()
        elif v.credit == 0:
            v.state = Waiting()
    def refund(self, v):
        amount, v.credit = v.credit, 0
        v.state = Waiting()
        return amount

class SoldOut:
    def insert(self, v, coins):
        raise ValueError("sold out")
    def select(self, v):
        raise ValueError("sold out")
    def refund(self, v):
        amount, v.credit = v.credit, 0
        return amount

class Vendor:
    def __init__(self, price, stock=10):
        self.price, self.stock = price, stock
        self.credit, self.dispensed = 0, []
        self.state = Waiting()
    def insert(self, coins):
        self.state.insert(self, coins)
    def select(self):
        self.state.select(self)
    def refund(self):
        return self.state.refund(self)

v = Vendor(150, stock=2)
v.insert(100); v.insert(100); v.select()
print(v.credit, type(v.state).__name__, v.refund())
```

```python test
import ast as _ast
for _n in ["Waiting", "HasCredit", "SoldOut", "Vendor"]:
    assert _n in dir(), f"Define {_n}."
_v = Vendor(150, stock=3)
assert isinstance(_v.state, Waiting), "A new machine is Waiting."
try:
    _v.select(); assert False, "Selecting with no credit should raise ValueError."
except ValueError:
    pass
_v.insert(100)
assert isinstance(_v.state, HasCredit) and _v.credit == 100, "Inserting moves to HasCredit."
try:
    _v.select(); assert False, "Selecting with too little credit should raise."
except ValueError:
    pass
_v.insert(100); _v.select()
assert _v.dispensed == ["item"] and _v.credit == 50 and isinstance(_v.state, HasCredit), "A sale leaves 50p credit, still in HasCredit."
assert _v.refund() == 50 and _v.credit == 0 and isinstance(_v.state, Waiting), "Refund returns the credit and goes back to Waiting."
assert _v.refund() == 0, "Refund with nothing in returns 0."
_v.insert(150); _v.select()
assert isinstance(_v.state, Waiting) and _v.stock == 1, "Exact money returns to Waiting after the sale."
_v.insert(200); _v.select()
assert isinstance(_v.state, SoldOut) and _v.stock == 0 and _v.credit == 50, "The last sale empties the stock: SoldOut, with 50p still owed."
for _call in [lambda: _v.insert(10), _v.select]:
    try:
        _call(); assert False, "A sold-out machine refuses coins and selections."
    except ValueError:
        pass
assert _v.refund() == 50 and _v.credit == 0, "A sold-out machine still refunds."
_vendor_src = _ast.parse(_source)
_cls = next(_n for _n in _ast.walk(_vendor_src) if isinstance(_n, _ast.ClassDef) and _n.name == "Vendor")
_names = {_n.id for _n in _ast.walk(_cls) if isinstance(_n, _ast.Name)}
assert not ({"isinstance", "type"} & _names), "Vendor should delegate to its state, not check which state it is in."
"SUCCESS: Each state class holds everything the machine does in that mode, and the machine itself just passes each button press to its current state."
```

Hint: Each state method takes the vendor as its first argument after `self` and changes `v.credit`, `v.stock` and `v.state` as needed. `Vendor.__init__` sets `self.state = Waiting()`, and each `Vendor` method is one line: `self.state.<event>(self, ...)`, returning the result for `refund`.
:::

::: challenge A machine with entry and exit actions [hard]
Build a CNC controller whose states perform actions on entry and exit. Write a base class `State` with `name`, and `enter(machine)` and `exit(machine)` that do nothing, and four states: `Idle` (name `"idle"`), `Running` (entering logs `"spindle on"`, exiting logs `"spindle off"`), `Paused` (entering logs `"feed hold"`, exiting logs `"feed release"`) and `Fault` (entering logs `f"ALARM {machine.fault_code}"`).

Write `Cnc` with a `log` list, a `fault_code` (None at first), `state`, the current state object (starting as `Idle()`), and `handle(event, code=None)`. The legal moves are: idle→running on `"start"`; running→paused on `"pause"`; paused→running on `"resume"`; running→idle and paused→idle on `"stop"`; any state except fault → fault on `"fault"` (storing `code` in `fault_code` **before** entering); fault→idle on `"reset"` (clearing `fault_code`). Each legal move logs, in order: the old state's exit actions, then `f"{old} -> {new}"`, then the new state's entry actions. An illegal event raises `InvalidTransition`, a subclass of `ValueError` you define, and changes nothing (no log entry).

```python starter
class InvalidTransition(ValueError):
    pass

class Cnc:
    def __init__(self):
        self.log = []

print("write the states and Cnc.handle")
```

```python solution
class InvalidTransition(ValueError):
    pass

class State:
    name = "?"
    def enter(self, machine): pass
    def exit(self, machine): pass

class Idle(State):
    name = "idle"

class Running(State):
    name = "running"
    def enter(self, machine): machine.log.append("spindle on")
    def exit(self, machine): machine.log.append("spindle off")

class Paused(State):
    name = "paused"
    def enter(self, machine): machine.log.append("feed hold")
    def exit(self, machine): machine.log.append("feed release")

class Fault(State):
    name = "fault"
    def enter(self, machine): machine.log.append(f"ALARM {machine.fault_code}")

class Cnc:
    TABLE = {("idle", "start"): Running, ("running", "pause"): Paused, ("paused", "resume"): Running,
             ("running", "stop"): Idle, ("paused", "stop"): Idle, ("fault", "reset"): Idle}

    def __init__(self):
        self.log, self.fault_code = [], None
        self.state = Idle()

    def handle(self, event, code=None):
        if event == "fault" and self.state.name != "fault":
            target = Fault
        else:
            target = self.TABLE.get((self.state.name, event))
        if target is None:
            raise InvalidTransition(f"'{event}' is not allowed when {self.state.name}")
        if event == "fault":
            self.fault_code = code
        new = target()
        self.state.exit(self)
        self.log.append(f"{self.state.name} -> {new.name}")
        self.state = new
        new.enter(self)
        if event == "reset":
            self.fault_code = None

m = Cnc()
for e in ["start", "pause", "resume"]:
    m.handle(e)
m.handle("fault", code=17)
print(m.log)
```

```python test
for _n in ["InvalidTransition", "State", "Idle", "Running", "Paused", "Fault", "Cnc"]:
    assert _n in dir(), f"Define {_n}."
assert issubclass(InvalidTransition, ValueError), "InvalidTransition should subclass ValueError."
for _cls, _name in [(Idle, "idle"), (Running, "running"), (Paused, "paused"), (Fault, "fault")]:
    assert issubclass(_cls, State) and _cls.name == _name, f"Define {_cls.__name__} as a State subclass with name {_name!r} (the lesson's printer demo has a different Idle)."
_m = Cnc()
_m.handle("start"); _m.handle("pause"); _m.handle("resume"); _m.handle("stop")
assert _m.log == ["idle -> running", "spindle on", "spindle off", "running -> paused", "feed hold", "feed release", "paused -> running", "spindle on", "spindle off", "running -> idle"], f"Got {_m.log}."
_m = Cnc()
_m.handle("start"); _m.handle("pause"); _m.handle("fault", code=17)
assert _m.log[-3:] == ["feed release", "paused -> fault", "ALARM 17"] and _m.fault_code == 17, f"Faulting from paused: exit paused, move, raise the alarm with the code; got {_m.log[-3:]}."
for _bad in ["start", "fault", "resume"]:
    _before = list(_m.log)
    try:
        _m.handle(_bad, code=99)
        assert False, f"'{_bad}' should not be allowed in fault."
    except InvalidTransition:
        pass
    assert _m.log == _before and _m.fault_code == 17, "A rejected event changes nothing."
_m.handle("reset")
assert _m.state.name == "idle" and _m.fault_code is None and _m.log[-1] == "fault -> idle", "Reset returns to idle and clears the code."
_m2 = Cnc()
_m2.handle("fault", code=3)
assert _m2.log == ["idle -> fault", "ALARM 3"], "Faults are possible from idle too."
_m3 = Cnc()
_m3.handle("start"); _m3.handle("fault", code=5)
assert _m3.log == ["idle -> running", "spindle on", "spindle off", "running -> fault", "ALARM 5"], "A fault while running still switches the spindle off on exit."
try:
    Cnc().handle("pause")
    assert False, "Pausing an idle machine is illegal."
except ValueError:
    pass
"SUCCESS: A table decides which moves are legal, and the states' own entry and exit actions run on every route, so no transition can forget to stop the spindle."
```

Hint: Keep a table for the ordinary moves and treat `"fault"` separately (allowed from any state but fault). In `handle`, find the target class first and raise `InvalidTransition` before changing anything. Then store the fault code if needed, call the old state's `exit`, log the move, switch, and call the new state's `enter`.
:::

## What you learned

- When an object's behaviour depends on its mode, checking a mode variable in every method spreads the rules everywhere, and lets them disagree.
- A transition table, a dict from `(state, event)` to the next state, writes the rules down in one place. A finite-state machine runs it and rejects every move not in the table. When states differ only in which moves are legal, this is the whole solution.
- When each state also behaves differently, the state pattern gives each mode a class. The context delegates every event to its current state object, with no `if` on the mode.
- Entry and exit actions belong to states, not to transitions, so they run on every route in or out and cannot be forgotten.

The next lesson fixes the skeleton of an algorithm in a base class and lets subclasses fill in particular steps: the template method pattern.
