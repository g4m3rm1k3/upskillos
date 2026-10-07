# Command

A method call happens and is gone. You cannot put it in a list, look at it later, run it tomorrow, or take it back. The **command** pattern turns a request into an **object**: something holding everything needed to carry out one action, with a method to do it. Once actions are objects, a program can keep a history of them and undo them, queue them for later, group several into one, log them to a file and replay them after a crash, or send them to another machine.

Undo is the classic use. Every editor's Ctrl+Z is a stack of command objects, each knowing how to reverse itself.

This lesson covers:

- the problem: actions done directly, with no way to take them back;
- command objects with `execute` and `undo`, and a history that undoes and redoes;
- macro commands that group several actions, and undoing a group safely;
- commands as data: logging actions and replaying them.

## The problem: actions that cannot be taken back

An operator panel adjusts a machine: spindle speed, feed rate, coolant. The buttons call the machine's methods directly. Predict before reading on: after an operator mistypes 18,000 rpm instead of 8,000, how does the panel restore the previous speed?

```python type
class Machine:
    def __init__(self):
        self.rpm, self.feed, self.coolant = 6000, 400, False
    def __repr__(self):
        return f"Machine(rpm={self.rpm}, feed={self.feed}, coolant={self.coolant})"

m = Machine()
m.rpm = 18000
m.feed = 650
print(m, "- and the old values are gone")
```

```output
Machine(rpm=18000, feed=650, coolant=False) - and the old values are gone
```

It cannot: the old value was overwritten, and nothing recorded it. Adding "remember the previous value" to every button handler scatters undo logic everywhere, and undoing several steps in order (feed, then speed) would need a history that nothing keeps.

## Command objects and a history

Make each action an object. A `SetAttribute` command holds the machine, a setting's name and its new value. `execute` remembers the old value and applies the new one, and `undo` puts the old value back. A `History` (in pattern language, the **invoker**) runs commands and keeps them on an **undo stack**. Undoing pops the latest command, reverses it, and pushes it onto a **redo stack**, so it can be redone. Running a **new** command clears the redo stack, because the redone action would no longer follow on from the current state. Predict before running: after two changes, two undos and one redo, what are the settings?

```python type
class SetAttribute:
    def __init__(self, machine, name, value):
        self.machine, self.name, self.value = machine, name, value
        self.old = None
    def execute(self):
        self.old = getattr(self.machine, self.name)
        setattr(self.machine, self.name, self.value)
    def undo(self):
        setattr(self.machine, self.name, self.old)
    def __repr__(self):
        return f"set {self.name} = {self.value}"

class History:
    def __init__(self):
        self._done, self._undone = [], []
    def run(self, command):
        command.execute()
        self._done.append(command)
        self._undone.clear()
    def undo(self):
        command = self._done.pop()
        command.undo()
        self._undone.append(command)
        return command
    def redo(self):
        command = self._undone.pop()
        command.execute()
        self._done.append(command)
        return command

m = Machine()
history = History()
history.run(SetAttribute(m, "rpm", 18000))
history.run(SetAttribute(m, "feed", 650))
print(m)
print("undo:", history.undo(), "->", m)
print("undo:", history.undo(), "->", m)
print("redo:", history.redo(), "->", m)
```

```output
Machine(rpm=18000, feed=650, coolant=False)
undo: set feed = 650 -> Machine(rpm=18000, feed=400, coolant=False)
undo: set rpm = 18000 -> Machine(rpm=6000, feed=400, coolant=False)
redo: set rpm = 18000 -> Machine(rpm=18000, feed=400, coolant=False)
```

`getattr(obj, name)` and `setattr(obj, name, value)` read and write an attribute whose name is a string, so one command class covers any setting.

After two undos the machine is back to 6,000 rpm and 400 mm/min, and the redo re-applies the speed change, giving 18,000 rpm with the original feed. The machine class contains no undo code at all. Each command carries exactly what it needs to reverse itself: the old value, captured at the moment it ran.

## Macros, and undoing a group safely

A **macro command** is a command made of other commands (a composite, from the composite lesson). "Set up for aluminium" might set the speed, the feed and the coolant at once. Executing runs the parts in order, and undoing must reverse them in the **opposite** order: the last change made is the first one reversed, exactly as when taking off layers of clothing.

A subtler point: if step three of five fails, the first two have already changed the machine. A macro should then undo the steps that succeeded, and re-raise the error, so the machine is left as it was. That makes the macro **all or nothing**, which is what a database calls a transaction. Predict before running: after the failing macro, are the speed and feed back to their starting values?

```python type
class Macro:
    def __init__(self, name, *commands):
        self.name, self.commands = name, commands
    def execute(self):
        done = []
        try:
            for command in self.commands:
                command.execute()
                done.append(command)
        except Exception:
            for command in reversed(done):
                command.undo()
            raise
    def undo(self):
        for command in reversed(self.commands):
            command.undo()
    def __repr__(self):
        return self.name

class FailingCommand:
    def execute(self):
        raise RuntimeError("coolant pump not responding")
    def undo(self):
        pass

m = Machine()
history = History()
history.run(Macro("aluminium setup", SetAttribute(m, "rpm", 12000), SetAttribute(m, "feed", 900), SetAttribute(m, "coolant", True)))
print(m)
history.undo()
print("after undo:", m)

try:
    history.run(Macro("bad setup", SetAttribute(m, "rpm", 15000), SetAttribute(m, "feed", 1200), FailingCommand()))
except RuntimeError as error:
    print("failed:", error, "->", m)
```

```output
Machine(rpm=12000, feed=900, coolant=True)
after undo: Machine(rpm=6000, feed=400, coolant=False)
failed: coolant pump not responding -> Machine(rpm=6000, feed=400, coolant=False)
```

A failed command never reaches the history, because `History.run` only appends after `execute` returns.

The aluminium setup is undone in one step, in reverse order, back to the defaults. The bad setup changed the speed and feed, failed at the coolant, and rolled both back before re-raising, so the machine is exactly as it was. Without the rollback, a half-applied setup would leave the machine in a state nobody chose.

## Commands as data: logging and replay

A command object can also be described as **data**: a small dict such as `{"op": "set", "name": "rpm", "value": 9000}`. Data can be written to a log file, sent over a network, or stored. A registry turns each dict back into a command object, so a log of everything an operator did can be **replayed** to rebuild the machine's state, for example after a restart, or to reproduce a problem exactly. Predict before running: does replaying the log on a fresh machine reproduce the final settings?

```python type
import json

COMMANDS = {"set": lambda machine, d: SetAttribute(machine, d["name"], d["value"])}

def command_from(machine, data):
    return COMMANDS[data["op"]](machine, data)

operator_log = json.dumps([
    {"op": "set", "name": "rpm", "value": 9000},
    {"op": "set", "name": "coolant", "value": True},
    {"op": "set", "name": "feed", "value": 720},
])

fresh = Machine()
for data in json.loads(operator_log):
    command_from(fresh, data).execute()
print("replayed:", fresh)
```

```output
replayed: Machine(rpm=9000, feed=720, coolant=True)
```

`json.dumps` and `json.loads` turn the list of dicts into text and back, the form in which a log would be stored.

The fresh machine ends with exactly the settings the log describes. This is the idea behind database write-ahead logs, "event sourcing" in business software, and the macro recorders in CAD programs: keep the sequence of commands, and the state can always be rebuilt from it.

In Python, a command does not always need a class. A pair of functions, `(do, undo)`, often made with `lambda` or `functools.partial`, can serve as a command when there is no state to capture. A class pays off when the command must remember something at execution time, like the old value, or be described as data.

::: challenge An undoable inventory adjustment [easy]
Write a command class `Adjust(stock, part, change)`, where `stock` is a dict from part name to quantity. `execute()` adds `change` (which may be negative) to the part's quantity, treating a missing part as 0, and raises `ValueError` without changing anything if the result would be negative. `undo()` restores exactly what was there before: if the part was absent before `execute`, `undo` removes it again. The lesson's `History` is available, and must work with your command.

```python starter
class Adjust:
    def __init__(self, stock, part, change):
        self.stock, self.part, self.change = stock, part, change

print("write execute and undo")
```

```python solution
class Adjust:
    def __init__(self, stock, part, change):
        self.stock, self.part, self.change = stock, part, change
        self._had_part, self._old = False, 0

    def execute(self):
        self._had_part = self.part in self.stock
        self._old = self.stock.get(self.part, 0)
        new = self._old + self.change
        if new < 0:
            raise ValueError(f"only {self._old} {self.part} in stock")
        self.stock[self.part] = new

    def undo(self):
        if self._had_part:
            self.stock[self.part] = self._old
        else:
            del self.stock[self.part]

stock = {"bolt": 10}
h = History()
h.run(Adjust(stock, "bolt", -4)); h.run(Adjust(stock, "nut", 25))
print(stock); h.undo(); h.undo(); print(stock)
```

```python test
assert "Adjust" in dir(), "Keep the class name Adjust."
_stock = {"bolt": 10}
_h = History()
_h.run(Adjust(_stock, "bolt", -4))
_h.run(Adjust(_stock, "nut", 25))
assert _stock == {"bolt": 6, "nut": 25}, f"Got {_stock}."
_h.undo()
assert _stock == {"bolt": 6}, "Undoing the nut adjustment removes the part it created."
_h.undo()
assert _stock == {"bolt": 10}, "Undoing restores the old quantity."
_h.redo()
assert _stock == {"bolt": 6}, "Redo applies the change again."
try:
    _h.run(Adjust(_stock, "bolt", -7))
    assert False, "Taking 7 of 6 should raise ValueError."
except ValueError:
    pass
assert _stock == {"bolt": 6}, "A refused adjustment changes nothing."
_s2 = {"pin": 0}
_a = Adjust(_s2, "pin", 5); _a.execute(); _a.undo()
assert _s2 == {"pin": 0}, "A part that existed with quantity 0 is restored, not removed."
"SUCCESS: Each adjustment remembers exactly what it changed, so the history can take it back and redo it."
```

Hint: In `execute`, record whether the part existed and its old quantity **before** changing anything, check the new quantity, then store it. `undo` puts the old quantity back if the part existed, and deletes it otherwise.
:::

::: challenge A complete undo/redo history [medium]
Write a class `UndoStack` for any commands with `execute()` and `undo()`:

- `run(command)` executes it and records it; it also clears anything that could be redone. If `execute` raises, nothing is recorded and the redo list is left alone;
- `undo()` and `redo()` reverse or re-apply one step and return the command, raising `IndexError` with a helpful message when there is nothing to undo or redo;
- `can_undo` and `can_redo` are read-only properties;
- `limit` (a constructor argument, default 100): when more than `limit` commands are recorded, the oldest is forgotten, so it can no longer be undone.

```python starter
class UndoStack:
    def __init__(self, limit=100):
        self.limit = limit

print("write UndoStack")
```

```python solution
from collections import deque

class UndoStack:
    def __init__(self, limit=100):
        self._done = deque(maxlen=limit)
        self._undone = []

    def run(self, command):
        command.execute()
        self._done.append(command)
        self._undone.clear()

    def undo(self):
        if not self._done:
            raise IndexError("nothing to undo")
        command = self._done.pop()
        command.undo()
        self._undone.append(command)
        return command

    def redo(self):
        if not self._undone:
            raise IndexError("nothing to redo")
        command = self._undone.pop()
        command.execute()
        self._done.append(command)
        return command

    @property
    def can_undo(self):
        return bool(self._done)

    @property
    def can_redo(self):
        return bool(self._undone)

print("UndoStack ready")
```

```python test
assert "UndoStack" in dir(), "Keep the class name UndoStack."
_state = []
class _Push:
    def __init__(self, v): self.v = v
    def execute(self): _state.append(self.v)
    def undo(self): _state.pop()
class _Boom:
    def execute(self): raise RuntimeError("no")
    def undo(self): raise AssertionError("never executed, never undone")
_u = UndoStack()
assert not _u.can_undo and not _u.can_redo, "A new stack can do neither."
for _v in "abc":
    _u.run(_Push(_v))
assert _state == list("abc") and _u.can_undo, "Commands run and are recorded."
assert _u.undo().v == "c" and _u.undo().v == "b" and _state == ["a"] and _u.can_redo, "Undo reverses the latest first."
assert _u.redo().v == "b" and _state == ["a", "b"], "Redo re-applies."
_u.run(_Push("x"))
assert not _u.can_redo and _state == ["a", "b", "x"], "A new command clears the redo list."
_u.undo()
try:
    _u.run(_Boom())
    assert False, "A failing command should raise."
except RuntimeError:
    pass
assert _u.can_redo and _u.redo().v == "x", "A failed command is not recorded and does not clear redo."
for _ in range(3):
    _u.undo()
for _bad in [_u.undo, ]:
    try:
        _bad()
        assert False, "Undo with nothing left should raise IndexError."
    except IndexError:
        pass
_state.clear()
_small = UndoStack(limit=3)
for _v in range(5):
    _small.run(_Push(_v))
_undone = 0
while _small.can_undo:
    _small.undo(); _undone += 1
assert _undone == 3 and _state == [0, 1], f"Only the last 3 commands can be undone; undid {_undone}, state {_state}."
try:
    _u.can_undo = True
    assert False, "can_undo should be read-only."
except AttributeError:
    pass
"SUCCESS: The stack undoes and redoes in the right order, forgets the oldest steps beyond its limit, and never records a command that failed."
```

Hint: A `collections.deque(maxlen=limit)` drops its oldest item automatically when it overflows, which gives the limit for free. Execute **before** recording, so a raising command never gets recorded. Clear the redo list only after a successful run.
:::

::: challenge Replayable, all-or-nothing batches [hard]
A parts store accepts batches of commands as data, such as `{"op": "receive", "part": "bolt", "qty": 50}`, `{"op": "issue", "part": "bolt", "qty": 5}` and `{"op": "rename", "part": "bolt", "to": "bolt M8"}`. Write:

- three command classes, `Receive`, `Issue` and `Rename`, each built from `(stock, data)` with `execute()` and `undo()`. `stock` is a dict of part to quantity. `Issue` raises `ValueError` if there is not enough; `Rename` raises `KeyError` if the part does not exist and `ValueError` if the new name is already used. `undo` restores exactly what was there before, including removing a part that `Receive` created;
- `COMMANDS`, a dict from op name to class;
- `apply_batch(stock, batch)`: builds each command from its dict (an unknown op raises `ValueError`), executes them in order, and returns the list of executed command objects. If any step raises, it undoes the steps already done in reverse order, so `stock` is exactly as it was, and re-raises the error.

```python starter
COMMANDS = {}

def apply_batch(stock, batch):
    return []

print(apply_batch({}, [{"op": "receive", "part": "bolt", "qty": 50}]))
```

```python solution
class Receive:
    def __init__(self, stock, data):
        self.stock, self.part, self.qty = stock, data["part"], data["qty"]
        self._existed = False
    def execute(self):
        self._existed = self.part in self.stock
        self.stock[self.part] = self.stock.get(self.part, 0) + self.qty
    def undo(self):
        if self._existed:
            self.stock[self.part] -= self.qty
        else:
            del self.stock[self.part]

class Issue:
    def __init__(self, stock, data):
        self.stock, self.part, self.qty = stock, data["part"], data["qty"]
        self._existed = False
    def execute(self):
        self._existed = self.part in self.stock
        have = self.stock.get(self.part, 0)
        if have < self.qty:
            raise ValueError(f"only {have} {self.part} in stock")
        self.stock[self.part] = have - self.qty
    def undo(self):
        if self._existed:
            self.stock[self.part] += self.qty
        else:
            del self.stock[self.part]

class Rename:
    def __init__(self, stock, data):
        self.stock, self.part, self.to = stock, data["part"], data["to"]
    def execute(self):
        if self.part not in self.stock:
            raise KeyError(self.part)
        if self.to in self.stock:
            raise ValueError(f"{self.to} already exists")
        self.stock[self.to] = self.stock.pop(self.part)
    def undo(self):
        self.stock[self.part] = self.stock.pop(self.to)

COMMANDS = {"receive": Receive, "issue": Issue, "rename": Rename}

def apply_batch(stock, batch):
    done = []
    try:
        for data in batch:
            if data.get("op") not in COMMANDS:
                raise ValueError(f"unknown operation {data.get('op')!r}")
            command = COMMANDS[data["op"]](stock, data)
            command.execute()
            done.append(command)
    except Exception:
        for command in reversed(done):
            command.undo()
        raise
    return done

stock = {}
apply_batch(stock, [{"op": "receive", "part": "bolt", "qty": 50}, {"op": "issue", "part": "bolt", "qty": 5}])
print(stock)
```

```python test
for _n in ["Receive", "Issue", "Rename", "COMMANDS", "apply_batch"]:
    assert _n in dir(), f"Define {_n}."
assert set(COMMANDS) == {"receive", "issue", "rename"}, "COMMANDS maps the three op names to classes."
_s = {"nut": 100}
_done = apply_batch(_s, [{"op": "receive", "part": "bolt", "qty": 50}, {"op": "issue", "part": "bolt", "qty": 5}, {"op": "rename", "part": "bolt", "to": "bolt M8"}, {"op": "issue", "part": "nut", "qty": 40}])
assert _s == {"nut": 60, "bolt M8": 45}, f"Got {_s}."
assert len(_done) == 4 and all(hasattr(_c, "undo") for _c in _done), "apply_batch returns the executed commands."
for _c in reversed(_done):
    _c.undo()
assert _s == {"nut": 100}, f"Undoing every command in reverse restores the start exactly; got {_s}."
_before = {"nut": 100, "washer": 7}
for _bad_batch, _err in [
    ([{"op": "receive", "part": "bolt", "qty": 10}, {"op": "issue", "part": "washer", "qty": 2}, {"op": "issue", "part": "nut", "qty": 500}], ValueError),
    ([{"op": "receive", "part": "nut", "qty": 1}, {"op": "rename", "part": "pin", "to": "x"}], KeyError),
    ([{"op": "rename", "part": "nut", "to": "washer"}], ValueError),
    ([{"op": "receive", "part": "x", "qty": 1}, {"op": "scrap", "part": "x"}], ValueError),
]:
    _s = dict(_before)
    try:
        apply_batch(_s, _bad_batch)
        assert False, f"This batch should raise {_err.__name__}: {_bad_batch}"
    except _err:
        pass
    assert _s == _before, f"A failed batch must leave the stock exactly as it was; got {_s}."
assert apply_batch({}, []) == [], "An empty batch does nothing."
"SUCCESS: Batches arrive as data, become command objects, and either all apply or none do, with every completed step rolled back in reverse."
```

Hint: Each command records, in `execute`, whatever it needs to reverse itself (for `Receive`, whether the part existed). `Rename` can move the quantity with `stock.pop`. In `apply_batch`, keep a list of commands done so far inside `try`, and in `except`, undo them in `reversed` order before a bare `raise`.
:::

## What you learned

- Command turns a request into an object holding everything needed to perform it, so actions can be stored, queued, logged, undone and replayed.
- Undo works because each command captures, at execution time, what it needs to reverse itself. A history keeps an undo stack and a redo stack, and a new command clears the redo stack.
- A macro command groups commands, undoing them in reverse order. Rolling back the completed steps when one fails makes the group all or nothing.
- Commands described as data can be logged and replayed through a registry, rebuilding state from the sequence of actions.
- In Python, a pair of functions can serve as a simple command; a class pays off when the command must remember state or be stored as data.

The next lesson replaces tangled conditionals about an object's mode with objects for each state: the state pattern.
