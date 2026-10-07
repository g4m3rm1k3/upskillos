# Memento

The command lesson undid actions by reversing them one at a time, which means every action must know how to undo itself. Sometimes that is hard or impossible: a long simulation step, a complicated layout algorithm, an operation with dozens of side effects. There is a simpler approach: before changing an object, take a **snapshot** of its state, and to undo, restore the snapshot. The **memento** pattern does this without breaking encapsulation. The object itself (the **originator**) creates the snapshot and restores from it, so its internals stay private. Other code (the **caretaker**) only stores snapshots and hands them back, without looking inside.

Mementos are everywhere: a game's saved checkpoints, a spreadsheet's "revert to last saved", a database transaction's rollback, an optimiser that remembers the best solution so far, and a long simulation's checkpoints that let it be resumed or rewound.

This lesson covers:

- the problem: undoing by hand, and copying internals from outside;
- the memento: the originator saves and restores itself; the caretaker only stores;
- snapshots compared with commands, and keeping memory under control;
- checkpointing a simulation, including the state you forget to save.

## The problem: copying internals from outside

A machine's tool-offset table records a length and radius correction for each tool. Before an operator edits it, the panel wants a way back. The quick approach copies the table's internal data from outside. Predict before reading on: what happens to the panel's code when the table class adds a timestamp of the last change, or switches its storage to two arrays?

```python type
class OffsetTable:
    def __init__(self):
        self.offsets = {"T1": (120.05, 3.00), "T2": (95.40, 4.98)}

    def set_offset(self, tool, length, radius):
        if radius < 0:
            raise ValueError("radius cannot be negative")
        self.offsets[tool] = (length, radius)

table = OffsetTable()
backup = dict(table.offsets)
table.set_offset("T1", 121.10, 3.02)
table.set_offset("T3", 60.00, 2.50)
table.offsets = backup
print(table.offsets)
```

```output
{'T1': (120.05, 3.0), 'T2': (95.4, 4.98)}
```

The panel reached into `offsets`, copied it and later assigned it back. It works today, but the panel now depends on the table's internal layout. If the table adds a last-changed time, the panel's restore silently fails to restore it. If the table changes its storage, the panel breaks. And assigning `table.offsets = ...` from outside bypasses the class's own checks.

## The memento

Let the table save and restore itself. `save()` returns a **memento**: an object holding a snapshot of everything needed to restore, which outside code treats as a sealed package. `restore(memento)` puts the table back. The caretaker, here the panel's history, keeps mementos in a list and never looks inside them. Making the snapshot immutable (a frozen dataclass holding a tuple) means a stored snapshot cannot be changed later by accident. Predict before running: after editing twice and restoring the first snapshot, is the change time restored too?

```python type
from dataclasses import dataclass

@dataclass(frozen=True)
class OffsetSnapshot:
    _offsets: tuple
    _changed_at: str

class OffsetTable:
    def __init__(self):
        self._offsets = {"T1": (120.05, 3.00), "T2": (95.40, 4.98)}
        self._changed_at = "never"

    def set_offset(self, tool, length, radius, when):
        if radius < 0:
            raise ValueError("radius cannot be negative")
        self._offsets[tool] = (length, radius)
        self._changed_at = when

    def save(self):
        return OffsetSnapshot(tuple(sorted(self._offsets.items())), self._changed_at)

    def restore(self, snapshot):
        self._offsets = dict(snapshot._offsets)
        self._changed_at = snapshot._changed_at

    def describe(self):
        return f"{dict(sorted(self._offsets.items()))} (changed {self._changed_at})"

table = OffsetTable()
checkpoints = [table.save()]
table.set_offset("T1", 121.10, 3.02, "09:14")
checkpoints.append(table.save())
table.set_offset("T3", 60.00, 2.50, "09:20")
print("now:      ", table.describe())
table.restore(checkpoints[1])
print("restore 1:", table.describe())
table.restore(checkpoints[0])
print("restore 0:", table.describe())
```

```output
now:       {'T1': (121.1, 3.02), 'T2': (95.4, 4.98), 'T3': (60.0, 2.5)} (changed 09:20)
restore 1: {'T1': (121.1, 3.02), 'T2': (95.4, 4.98)} (changed 09:14)
restore 0: {'T1': (120.05, 3.0), 'T2': (95.4, 4.98)} (changed never)
```

The snapshot's fields start with an underscore: a signal that only `OffsetTable` should read them. The caretaker (`checkpoints`) only stores and returns snapshots.

Each restore brings back everything, including the change time, which the panel never needed to know about. If the table adds more internal state, only `save` and `restore` change, and every caretaker keeps working. The snapshot holds a **tuple** of items, not the live dictionary, so later edits to the table can never alter a saved snapshot. Sharing the live dictionary would be the shallow-copy bug from the prototype lesson.

## Snapshots or commands?

Both give undo. Which is better depends on the size of the state and the nature of the changes:

- **Snapshots** are simple and always correct, provided they capture all the state: restore puts back exactly what was saved, however complicated the change was. But each snapshot stores the **whole** state, which is expensive if the state is large and changes are small.
- **Commands** store only the change, so they are cheap per step. But every command must know how to reverse itself exactly, which is hard for complex operations.

A common combination: snapshots now and then, with commands in between. To control memory, a caretaker can keep only the most recent snapshots, using a `deque` with a maximum length. Predict before running: after nine edits with room for three snapshots, how far back can the table be restored?

```python type
from collections import deque

table = OffsetTable()
recent = deque(maxlen=3)
for minute in range(9):
    recent.append(table.save())
    table.set_offset("T1", 120.0 + minute / 10, 3.0, f"10:{minute:02d}")
print("snapshots kept:", len(recent))
table.restore(recent[0])
print("oldest state available:", table.describe())
```

```output
snapshots kept: 3
oldest state available: {'T1': (120.5, 3.0), 'T2': (95.4, 4.98)} (changed 10:05)
```

`deque(maxlen=3)` drops its oldest item whenever a fourth is appended, so the caretaker never holds more than three snapshots.

Only the last three snapshots survive, so the oldest available state is from just before the seventh edit, at 10:05. Older states are gone for good. The limit is a trade between memory and how far back undo can reach.

## Checkpointing a simulation

Long simulations save checkpoints so that they can resume after a crash, or rewind to examine an interesting moment. The memento must capture **everything** that affects the future, and the easiest piece to forget is the **random number generator**. A simulation using random noise will not repeat after a restore unless the generator's state is saved and restored too. `random.Random` provides `getstate()` and `setstate()` for exactly this. Predict before running: after restoring the checkpoint, do the next three readings repeat exactly, with and without the random state?

```python type
import random

class VibrationSim:
    def __init__(self, seed):
        self._rng = random.Random(seed)
        self.t, self.amplitude = 0, 1.0

    def step(self):
        self.t += 1
        self.amplitude = round(self.amplitude * 0.98 + self._rng.uniform(-0.05, 0.08), 4)
        return self.amplitude

    def save(self, include_rng=True):
        return (self.t, self.amplitude, self._rng.getstate() if include_rng else None)

    def restore(self, memento):
        self.t, self.amplitude, rng_state = memento
        if rng_state is not None:
            self._rng.setstate(rng_state)

sim = VibrationSim(seed=7)
for _ in range(50):
    sim.step()
full, partial = sim.save(), sim.save(include_rng=False)
first_run = [sim.step() for _ in range(3)]
sim.restore(full)
replay = [sim.step() for _ in range(3)]
sim.restore(partial)
careless = [sim.step() for _ in range(3)]
print("after step 50:", first_run)
print("full restore: ", replay, replay == first_run)
print("no rng state: ", careless, careless == first_run)
```

```output
after step 50: [0.6645, 0.6166, 0.6086]
full restore:  [0.6645, 0.6166, 0.6086] True
no rng state:  [0.6355, 0.5925, 0.5942] False
```

`getstate()` returns the generator's complete internal state, and `setstate()` puts it back, so the generator continues exactly where it was.

With the generator's state restored, the replay is identical to the first run. Without it, the time and amplitude come back but the noise continues from wherever the generator had reached, and the "replay" quietly differs. A memento is only correct if the originator saves **all** of its state, which is the strongest argument for letting the originator itself build the memento: it is the only object that knows what all of its state is.

::: challenge Save and restore a counter [easy]
A production counter has a private count of good parts, a private count of rejects, and a private list of the last three reject reasons. Write `ProductionCounter` with `good()`, `reject(reason)` (adds the reason, keeping only the three most recent), `summary()` returning `(good, rejected, recent_reasons_list)` with a new list each time, so callers can't change the counter's state, `save()` returning a memento, and `restore(memento)`. The memento must be immutable (for example a tuple, or a frozen dataclass whose fields are tuples), and restoring it must bring back all three pieces of state. Changes made after a save must never alter that saved memento.

```python starter
class ProductionCounter:
    def __init__(self):
        self._good, self._rejected, self._reasons = 0, 0, []

c = ProductionCounter()
```

```python solution
class ProductionCounter:
    def __init__(self):
        self._good, self._rejected, self._reasons = 0, 0, []

    def good(self):
        self._good += 1

    def reject(self, reason):
        self._rejected += 1
        self._reasons = (self._reasons + [reason])[-3:]

    def summary(self):
        return self._good, self._rejected, list(self._reasons)

    def save(self):
        return (self._good, self._rejected, tuple(self._reasons))

    def restore(self, memento):
        self._good, self._rejected, reasons = memento
        self._reasons = list(reasons)

c = ProductionCounter()
c.good(); c.reject("burr")
m = c.save()
c.good(); c.reject("crack")
c.restore(m)
print(c.summary())
```

```python test
assert "ProductionCounter" in dir(), "Keep the class name ProductionCounter."
_c = ProductionCounter()
for _ in range(5):
    _c.good()
for _r in ["burr", "crack", "short", "porosity"]:
    _c.reject(_r)
assert _c.summary() == (5, 4, ["crack", "short", "porosity"]), f"Only the last three reasons are kept; got {_c.summary()}."
_m = _c.save()
assert hash(_m) is not None, "The memento should be immutable (hashable), such as a tuple."
_c.good(); _c.reject("dent"); _c.reject("scratch")
assert _c.summary() == (6, 6, ["porosity", "dent", "scratch"]), "Counting continues after a save."
_c.restore(_m)
assert _c.summary() == (5, 4, ["crack", "short", "porosity"]), f"Restore brings back all three pieces of state; got {_c.summary()}."
_c.reject("again")
_c.restore(_m)
assert _c.summary() == (5, 4, ["crack", "short", "porosity"]), "A memento can be restored more than once, and later changes never alter it."
_s = _c.summary()
_s[2].append("hack")
assert _c.summary()[2] == ["crack", "short", "porosity"], "summary should hand out a copy of the reasons list."
_fresh = ProductionCounter()
_fresh.restore(_m)
assert _fresh.summary() == (5, 4, ["crack", "short", "porosity"]), "A memento restores into a different counter too."
"SUCCESS: The counter packs its own private state into an immutable snapshot and unpacks it again, so callers can checkpoint it without knowing what is inside."
```

Hint: `save` can return `(self._good, self._rejected, tuple(self._reasons))`; a tuple of numbers and a tuple of strings is immutable. `restore` unpacks it and turns the reasons back into a new list. Keep only the last three reasons with a slice, `[-3:]`.
:::

::: challenge Named checkpoints with a guard [medium]
Write a caretaker, `Checkpoints`, that stores mementos by name for any originator with `save()` and `restore(memento)`. Give it `mark(name, originator)` to save a named checkpoint (replacing an older one of the same name), `back_to(name, originator)` to restore it (raising `KeyError` for an unknown name), and `names()` returning names in the order they were last marked (re-marking a name moves it to the end). Mementos must only be restored into the **kind** of object that made them: record `type(originator)` with each memento, and make `back_to` raise `TypeError` if the originator's type differs. Finally, `back_to` should, by default, delete every checkpoint marked **after** the one restored (they belong to an abandoned future), unless `keep_later=True` is passed.

```python starter
class Checkpoints:
    def __init__(self):
        self._saved = {}

print("write Checkpoints")
```

```python solution
class Checkpoints:
    def __init__(self):
        self._saved = {}

    def mark(self, name, originator):
        if name in self._saved:
            del self._saved[name]
        self._saved[name] = (type(originator), originator.save())

    def back_to(self, name, originator, keep_later=False):
        kind, memento = self._saved[name]
        if type(originator) is not kind:
            raise TypeError(f"checkpoint {name!r} belongs to a {kind.__name__}, not a {type(originator).__name__}")
        originator.restore(memento)
        if not keep_later:
            names = list(self._saved)
            for later in names[names.index(name) + 1:]:
                del self._saved[later]

    def names(self):
        return list(self._saved)

print("Checkpoints ready")
```

```python test
assert "Checkpoints" in dir(), "Keep the class name Checkpoints."
class _Box:
    def __init__(self): self.v = 0
    def save(self): return self.v
    def restore(self, m): self.v = m
class _Other(_Box):
    pass
_b, _cp = _Box(), Checkpoints()
_cp.mark("start", _b); _b.v = 1; _cp.mark("one", _b); _b.v = 2; _cp.mark("two", _b); _b.v = 3
assert _cp.names() == ["start", "one", "two"], "Names in the order marked."
_cp.back_to("one", _b, keep_later=True)
assert _b.v == 1 and _cp.names() == ["start", "one", "two"], "keep_later keeps the later checkpoints."
_cp.back_to("two", _b)
assert _b.v == 2, "Restoring a later checkpoint."
_cp.back_to("start", _b)
assert _b.v == 0 and _cp.names() == ["start"], "By default, checkpoints after the restored one are discarded."
try:
    _cp.back_to("one", _b)
    assert False, "A discarded checkpoint is gone: KeyError."
except KeyError:
    pass
_b.v = 5; _cp.mark("start", _b); _cp.mark("five", _b)
_b.v = 9; _cp.mark("start", _b)
assert _cp.names() == ["five", "start"], "Re-marking a name replaces it and makes it the newest."
try:
    _cp.back_to("five", _Other())
    assert False, "Restoring into a different type of object should raise TypeError."
except TypeError:
    pass
assert _b.v == 9, "A refused restore changes nothing."
_cp.back_to("start", _b)
assert _b.v == 9, "The replaced checkpoint holds the newer state."
"SUCCESS: The caretaker stores and returns snapshots by name without opening them, refuses mismatched restores, and prunes the futures you abandon."
```

Hint: Store `(type(originator), originator.save())` in a dict, which keeps insertion order; delete a name before re-marking it so it moves to the end. In `back_to`, check the type before restoring, then, unless `keep_later`, delete the names that come after it in `list(self._saved)`.
:::

::: challenge Rewinding a simulation exactly [hard]
Write `DriftSim(seed)`, a small simulation of a spindle's thermal drift. It has a private `random.Random(seed)`, a time `t` (starting at 0) and a drift in micrometres (starting at 0.0). `step()` advances t by 1 and sets `drift = round(drift + 0.3 + rng.gauss(0, 0.5), 3)`, returning the new drift. `save()` returns a memento including the generator state, and `restore(memento)` restores everything.

Then write `Recorder(sim, every)`, a caretaker that runs the simulation and saves a checkpoint every `every` steps (at t = 0, every, 2·every, ...). `run(steps)` advances the simulation by `steps` steps, saving checkpoints when t is a multiple of `every` (including the state at t = 0 before the first step, if not saved yet). `rewind_to(t)` puts the simulation back at exactly time `t` (any `t` from 0 to the current time), by restoring the latest checkpoint at or before `t` and stepping forward to `t`. It raises `ValueError` for a time in the future or below 0. After a rewind, checkpoints after `t` are dropped, and calling `run` again continues from `t`.

```python starter
import random

class DriftSim:
    def __init__(self, seed):
        self._rng = random.Random(seed)
        self.t, self.drift = 0, 0.0

print("write step, save, restore and Recorder")
```

```python solution
import random

class DriftSim:
    def __init__(self, seed):
        self._rng = random.Random(seed)
        self.t, self.drift = 0, 0.0

    def step(self):
        self.t += 1
        self.drift = round(self.drift + 0.3 + self._rng.gauss(0, 0.5), 3)
        return self.drift

    def save(self):
        return (self.t, self.drift, self._rng.getstate())

    def restore(self, memento):
        self.t, self.drift, state = memento
        self._rng.setstate(state)

class Recorder:
    def __init__(self, sim, every):
        self.sim, self.every = sim, every
        self._checkpoints = {}

    def _maybe_save(self):
        if self.sim.t % self.every == 0 and self.sim.t not in self._checkpoints:
            self._checkpoints[self.sim.t] = self.sim.save()

    def run(self, steps):
        self._maybe_save()
        for _ in range(steps):
            self.sim.step()
            self._maybe_save()

    def rewind_to(self, t):
        if t < 0 or t > self.sim.t:
            raise ValueError(f"cannot rewind to {t}")
        base = max(saved for saved in self._checkpoints if saved <= t)
        self.sim.restore(self._checkpoints[base])
        while self.sim.t < t:
            self.sim.step()
        for saved in [s for s in self._checkpoints if s > t]:
            del self._checkpoints[saved]

sim = DriftSim(seed=3)
rec = Recorder(sim, every=10)
rec.run(25)
at_25 = sim.drift
rec.rewind_to(17); rec.run(8)
print(at_25, sim.drift, at_25 == sim.drift)
```

```python test
for _n in ["DriftSim", "Recorder"]:
    assert _n in dir(), f"Define {_n}."
_ref = DriftSim(seed=11)
_truth = [0.0] + [_ref.step() for _ in range(60)]
_sim = DriftSim(seed=11)
_rec = Recorder(_sim, every=10)
_rec.run(37)
assert _sim.t == 37 and _sim.drift == _truth[37], "run advances the simulation exactly like stepping it by hand."
for _t in [37, 30, 23, 9, 0]:
    _rec.rewind_to(_t)
    assert _sim.t == _t and _sim.drift == _truth[_t], f"rewind_to({_t}) should give exactly the drift at t={_t}; got {_sim.drift}, expected {_truth[_t]}."
_rec.run(60)
assert _sim.t == 60 and _sim.drift == _truth[60], "After rewinding to 0 and running on, the future repeats exactly (the generator state was restored)."
for _bad in [61, -1]:
    try:
        _rec.rewind_to(_bad)
        assert False, f"Rewinding to {_bad} should raise ValueError."
    except ValueError:
        pass
_steps = []
_s2 = DriftSim(seed=4)
_real_step = _s2.step
def _count():
    _steps.append(1)
    return _real_step()
_s2.step = _count
_r2 = Recorder(_s2, every=10)
_r2.run(95)
_steps.clear()
_r2.rewind_to(83)
assert len(_steps) == 3, f"Rewinding to 83 should restore the checkpoint at 80 and step 3 times; it stepped {len(_steps)} times."
_r2.rewind_to(50); _steps.clear(); _r2.rewind_to(50)
assert len(_steps) == 0, "Rewinding to a checkpoint time needs no steps."
"SUCCESS: Checkpoints include the random generator, so any moment of the run can be rebuilt exactly from the nearest snapshot plus a few replayed steps."
```

Hint: `save` returns `(t, drift, rng.getstate())`; `restore` unpacks it and calls `setstate`. The recorder keeps a dict from time to memento. `rewind_to` restores the largest saved time not after `t`, steps forward until `self.sim.t == t`, and deletes saved times greater than `t`.
:::

## What you learned

- A memento is a snapshot of an object's state, created and restored by the object itself (the originator), so its internals stay private. Caretakers only store and hand back snapshots.
- Make mementos immutable and independent of the live state: tuples and frozen dataclasses, never shared mutable containers.
- Snapshots are simple and exact (if they capture all the state) but store the whole state; commands store only the change but must each know how to reverse it. A bounded `deque` limits how many snapshots are kept.
- A memento must capture all state that affects the future. In simulations, that includes the random generator: `getstate()` and `setstate()`.
- Checkpoints plus replay rebuild any moment exactly: restore the nearest earlier snapshot and step forward.

The next lesson builds a small language and evaluates it, using a tree of objects that each know how to interpret themselves: the interpreter pattern.
