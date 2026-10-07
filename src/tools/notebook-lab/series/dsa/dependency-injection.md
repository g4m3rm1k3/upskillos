# Dependency inversion and injection

Some of the hardest code to test is code that reaches out into the world by itself. A function that reads today's date gives different answers on different days. A function that opens its own database connection needs a real database for every test. A function that sends emails sends real emails when tested, or cannot be tested at all. A function that waits 30 seconds between retries makes every test wait too. Each of these is a **dependency**: something the code needs that is not one of its inputs. And when the code fetches the dependency itself, the dependency is hidden.

The SOLID lesson's last principle, **dependency inversion**, says important logic should depend on abstractions such as "something that tells the time" or "something that sends messages", not on concrete details. **Dependency injection** is the everyday technique that puts it into practice: instead of creating or fetching its collaborators, an object or function **receives** them as arguments. In production you pass the real clock, database and email sender. In tests you pass simple stand-ins that you control completely.

This lesson covers:

- spotting hidden dependencies, and why they make code untestable;
- injecting collaborators through a constructor, and testing with fakes;
- the kinds of stand-in, or **test double**: stubs, fakes and spies;
- injecting plain functions, default arguments, and wiring everything up in one place.

## Hidden dependencies

A tool library lends equipment and emails members whose loans are overdue. Here is a first version. It looks fine, and it works.

```python type
from datetime import date, timedelta

LOANS = [
    {"member": "ana@example.com", "tool": "tile cutter", "due": date.today() - timedelta(days=3)},
    {"member": "ben@example.com", "tool": "hedge trimmer", "due": date.today() + timedelta(days=4)},
    {"member": "cy@example.com", "tool": "pressure washer", "due": date.today() - timedelta(days=12)},
]

def send_email(to, subject):
    print(f"(really emailing {to}: {subject})")

def send_overdue_reminders():
    sent = 0
    for loan in LOANS:
        days_late = (date.today() - loan["due"]).days
        if days_late > 0:
            urgency = "FINAL NOTICE: " if days_late > 7 else ""
            send_email(loan["member"], f"{urgency}{loan['tool']} is {days_late} days overdue")
            sent += 1
    return sent

print("reminders sent:", send_overdue_reminders())
```

```output
(really emailing ana@example.com: tile cutter is 3 days overdue)
(really emailing cy@example.com: FINAL NOTICE: pressure washer is 12 days overdue)
reminders sent: 2
```

Now try to answer: does a loan exactly 7 days late get the final notice? To test that, you need a loan due exactly 7 days before **today**, in the global `LOANS` list, and you need to stop `send_email` from really sending, or capture what it prints. The function has three hidden dependencies: the clock (`date.today()`), the data (`LOANS`) and the messaging (`send_email`). None appears in its signature, so a reader cannot see them, and a test cannot replace them.

## Injecting collaborators

Make each dependency a parameter. `ReminderService` receives three collaborators in its constructor, a **clock** (any function returning today's date), a **repository** (any object with a `loans()` method) and a **sender** (any object with `send(to, subject)`), and only ever uses them through those small interfaces. This is constructor injection.

Tests then pass stand-ins. `FixedClock` always returns the same date, so "today" is whatever the test says. `InMemoryLoans` holds a list. `RecordingSender` sends nothing and remembers every message, so the test can inspect them. Predict before running: which members get a final notice?

```python type
class ReminderService:
    def __init__(self, clock, loans, sender):
        self.clock, self.loans, self.sender = clock, loans, sender

    def send_overdue_reminders(self):
        today = self.clock()
        sent = 0
        for loan in self.loans.loans():
            days_late = (today - loan["due"]).days
            if days_late > 0:
                urgency = "FINAL NOTICE: " if days_late > 7 else ""
                self.sender.send(loan["member"], f"{urgency}{loan['tool']} is {days_late} days overdue")
                sent += 1
        return sent

class InMemoryLoans:
    def __init__(self, loans):
        self._loans = list(loans)
    def loans(self):
        return list(self._loans)

class RecordingSender:
    def __init__(self):
        self.messages = []
    def send(self, to, subject):
        self.messages.append((to, subject))

def fixed_clock(day):
    return lambda: day

today = date(2026, 3, 20)
loans = InMemoryLoans([
    {"member": "ana", "tool": "drill", "due": date(2026, 3, 13)},
    {"member": "ben", "tool": "saw", "due": date(2026, 3, 12)},
    {"member": "cy", "tool": "ladder", "due": date(2026, 3, 20)},
])
outbox = RecordingSender()
service = ReminderService(fixed_clock(today), loans, outbox)
print("sent:", service.send_overdue_reminders())
for message in outbox.messages:
    print(message)
```

```output
sent: 2
('ana', 'drill is 7 days overdue')
('ben', 'FINAL NOTICE: saw is 8 days overdue')
```

`fixed_clock(day)` returns a function that ignores the real date and always returns `day`. A function is often the simplest injectable dependency.

The question from before now has an exact answer. Ana's loan is exactly 7 days late and gets an ordinary reminder; Ben's, 8 days late, gets the final notice; Cy's is due today and gets nothing. The test controlled the date, the data and the messaging completely, ran instantly, and sent nothing. `ReminderService` itself contains no dates, no data and no email code. It is pure policy, which is exactly the part worth testing.

## Kinds of test double

The stand-ins have names, worth knowing because they come up in every testing discussion:

- a **stub** returns fixed answers and nothing else, like `fixed_clock`;
- a **fake** is a real, working, simplified implementation, like `InMemoryLoans`: it behaves like a database but lives in a list;
- a **spy** records how it was used so the test can check afterwards, like `RecordingSender`;
- a **mock** is told in advance which calls to expect and checks them itself. Despite its name, Python's `unittest.mock.Mock` mostly works as an automatic stub and spy: you set its `return_value`, run the code, then check the recorded calls with methods like `assert_called_once_with`. Hand-written stubs, fakes and spies are usually clearer.

Because the service only depends on small interfaces, every double is a few lines long. That is a useful design signal in itself. If a test double is hard to write, the interface it imitates is probably too big: the interface segregation principle again.

## Functions, defaults and the composition root

Injected dependencies do not have to be objects. A single operation is often best injected as a **function**: the clock above, a random-number source, a `sleep`. And a **default argument** can supply the real dependency, so ordinary callers do not have to pass it while tests still can. Here is a password generator whose randomness is injected. Predict before running: are the two test passwords identical?

```python type
import random, string

def make_password(length=12, rng=random.SystemRandom()):
    alphabet = string.ascii_letters + string.digits
    return "".join(rng.choice(alphabet) for _ in range(length))

print("production:", make_password())
print("test:", make_password(8, random.Random(42)), make_password(8, random.Random(42)))
```

`random.SystemRandom` draws on the operating system's secure randomness, which is right for passwords. `random.Random(42)` is a seeded generator: the same seed gives the same sequence.

Production calls get secure randomness without thinking about it. The two test calls with the same seed produce the same password, so a test can check the exact output.

One caution about defaults: a default value is created **once**, when the function is defined, and shared by every call. A shared `SystemRandom` is fine. A default of `date.today()` would be a bug, because it would freeze the date when the function was defined. Pass the function `date.today` itself (no brackets), and call it inside.

Where do the real collaborators get created? In one place, at the program's entry point, often called the **composition root**: a `main()` that builds the real clock, repository and sender and hands them to the services. Everything below it receives what it needs and creates nothing. Python needs no dependency-injection framework for this: constructors and arguments are enough.

```python type
def main():
    service = ReminderService(clock=date.today, loans=InMemoryLoans(LOANS), sender=RecordingSender())
    return service.send_overdue_reminders()

print("main sent", main(), "reminders using today's real date")
```

```output
main sent 2 reminders using today's real date
```

In a real program, `main` would pass a database-backed repository and an SMTP sender instead of the in-memory ones; nothing else would change.

::: challenge A testable greeting [easy]
`greeting()` below reads the real clock, so its output depends on when it runs. Rewrite it as `greeting(clock=datetime.now)`: it calls `clock()` once to get the current `datetime` and returns `"Good morning"` for hours 5 to 11, `"Good afternoon"` for 12 to 17 and `"Good evening"` otherwise. Calling `greeting()` with no argument must still use the real clock.

```python starter
from datetime import datetime

def greeting():
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return "Good morning"
    if 12 <= hour < 18:
        return "Good afternoon"
    return "Good evening"

print(greeting())
```

```python solution
from datetime import datetime

def greeting(clock=datetime.now):
    hour = clock().hour
    if 5 <= hour < 12:
        return "Good morning"
    if 12 <= hour < 18:
        return "Good afternoon"
    return "Good evening"

print(greeting(), greeting(lambda: datetime(2026, 1, 1, 21, 0)))
```

```python test
from datetime import datetime as _dt
import inspect as _inspect
assert "greeting" in dir(), "Keep the function's name as greeting."
assert "clock" in _inspect.signature(greeting).parameters, "greeting should take a clock parameter."
_expected = {0: "Good evening", 4: "Good evening", 5: "Good morning", 11: "Good morning", 12: "Good afternoon", 17: "Good afternoon", 18: "Good evening", 23: "Good evening"}
for _h, _want in _expected.items():
    _got = greeting(lambda _h=_h: _dt(2026, 6, 1, _h, 30))
    assert _got == _want, f"At {_h}:30 the greeting should be {_want!r}; got {_got!r}."
_calls = []
def _spy_clock():
    _calls.append(1)
    return _dt(2026, 6, 1, 9, 0)
greeting(_spy_clock)
assert len(_calls) == 1, f"Call the clock exactly once; it was called {len(_calls)} times."
assert greeting() in ("Good morning", "Good afternoon", "Good evening"), "With no argument, greeting should still work using the real clock."
_default = _inspect.signature(greeting).parameters["clock"].default
assert callable(_default) and not isinstance(_default, _dt), "The default must be the function datetime.now, not a datetime value frozen at definition time."
"SUCCESS: The clock is now an input: tests choose any time of day, and normal callers still get the real time."
```

Hint: Add a parameter `clock=datetime.now`, with no brackets after `now`, so the default is the function itself. Inside, call `clock()` once and read `.hour` from the result.
:::

::: challenge A stock alert service [medium]
Write `StockAlerts(inventory, notifier)`. `inventory` is any object with `levels()`, returning a dict of part name to quantity on hand, and `reorder_points()`, returning a dict of part name to the minimum quantity before reordering. `notifier` is any object with `notify(message)`. Write a method `check()` that sends one message, `f"Reorder {part}: {on_hand} left (minimum {minimum})"`, for every part whose quantity is **below** its reorder point, in alphabetical order of part name, and returns the number of messages sent. Parts missing from `reorder_points()` are never reordered. Then write the two doubles a test would need: `FakeInventory(levels, reorder_points)`, which returns copies of the dicts it was given, and `CollectingNotifier`, whose `messages` attribute is a list of everything passed to `notify`.

```python starter
class StockAlerts:
    pass

print("write StockAlerts, FakeInventory and CollectingNotifier")
```

```python solution
class StockAlerts:
    def __init__(self, inventory, notifier):
        self.inventory, self.notifier = inventory, notifier

    def check(self):
        levels = self.inventory.levels()
        minimums = self.inventory.reorder_points()
        sent = 0
        for part in sorted(levels):
            if part in minimums and levels[part] < minimums[part]:
                self.notifier.notify(f"Reorder {part}: {levels[part]} left (minimum {minimums[part]})")
                sent += 1
        return sent

class FakeInventory:
    def __init__(self, levels, reorder_points):
        self._levels, self._reorder_points = dict(levels), dict(reorder_points)
    def levels(self):
        return dict(self._levels)
    def reorder_points(self):
        return dict(self._reorder_points)

class CollectingNotifier:
    def __init__(self):
        self.messages = []
    def notify(self, message):
        self.messages.append(message)

inv = FakeInventory({"bolt": 30, "nut": 400, "washer": 0}, {"bolt": 50, "nut": 100, "washer": 20})
note = CollectingNotifier()
print(StockAlerts(inv, note).check(), note.messages)
```

```python test
for _n in ["StockAlerts", "FakeInventory", "CollectingNotifier"]:
    assert _n in dir(), f"Define {_n}."
_inv = FakeInventory({"washer": 0, "bolt": 30, "nut": 400, "pin": 5}, {"bolt": 50, "nut": 100, "washer": 20})
_note = CollectingNotifier()
_sent = StockAlerts(_inv, _note).check()
assert _sent == 2, f"Two parts are below their reorder points; check() returned {_sent}."
assert _note.messages == ["Reorder bolt: 30 left (minimum 50)", "Reorder washer: 0 left (minimum 20)"], f"Messages, in part order: got {_note.messages}."
_note2 = CollectingNotifier()
assert StockAlerts(FakeInventory({"bolt": 50}, {"bolt": 50}), _note2).check() == 0 and _note2.messages == [], "Exactly at the reorder point is not below it."
_lv = {"a": 1}
_fi = FakeInventory(_lv, {"a": 5})
_fi.levels()["a"] = 999
_lv["a"] = 999
assert _fi.levels() == {"a": 1}, "FakeInventory should keep and hand out copies, so callers can't change its data."
class _SpyInventory:
    def __init__(self):
        self.calls = 0
    def levels(self):
        self.calls += 1
        return {"x": 1, "y": 9}
    def reorder_points(self):
        return {"x": 2, "y": 2}
class _ListNotifier:
    def __init__(self):
        self.got = []
    def notify(self, message):
        self.got.append(message)
_si, _ln = _SpyInventory(), _ListNotifier()
assert StockAlerts(_si, _ln).check() == 1 and _ln.got == ["Reorder x: 1 left (minimum 2)"], "StockAlerts must work with any inventory and notifier having the right methods."
assert _si.calls == 1, "Ask the inventory for its levels once per check."
"SUCCESS: StockAlerts depends only on two small interfaces, so it was tested with fakes and spies: no warehouse, no email, instant."
```

Hint: Store both collaborators in `__init__`. In `check`, fetch `levels()` and `reorder_points()` once, loop over `sorted(levels)`, and notify when the part has a minimum and its level is below it. The fakes are tiny: one stores dict copies and returns copies; the other appends to a list.
:::

::: challenge Retrying without waiting [hard]
Network calls fail now and then, so programs retry them, waiting longer after each failure. This is **exponential backoff**, and a little randomness, called **jitter**, is added so that many clients do not retry in step. Write `fetch_with_retry(fetch, attempts, base_delay, sleep, rng)`. It calls `fetch()`, and if it returns, returns its result. If `fetch()` raises `ConnectionError`, it waits by calling `sleep(delay)` and tries again, where after failure number i (counting from 0) the delay is `base_delay * 2**i + rng.uniform(0, base_delay)`. After `attempts` failed calls in total, it re-raises the last `ConnectionError`, without sleeping after the final failure. Any other exception propagates immediately, with no retry. `sleep` and `rng` are injected, so tests can check the exact delays without waiting at all.

```python starter
import random, time

def fetch_with_retry(fetch, attempts, base_delay, sleep=time.sleep, rng=random.Random()):
    return fetch()

print(fetch_with_retry(lambda: "ok", 3, 0.5))
```

```python solution
import random, time

def fetch_with_retry(fetch, attempts, base_delay, sleep=time.sleep, rng=random.Random()):
    for i in range(attempts):
        try:
            return fetch()
        except ConnectionError:
            if i == attempts - 1:
                raise
            sleep(base_delay * 2 ** i + rng.uniform(0, base_delay))

print(fetch_with_retry(lambda: "ok", 3, 0.5))
```

```python test
import time as _time
assert "fetch_with_retry" in dir(), "Keep the function's name as fetch_with_retry."
class _HalfRng:
    def uniform(self, a, b):
        return (a + b) / 2
def _flaky(failures, result="data"):
    _state = {"calls": 0}
    def _fetch():
        _state["calls"] += 1
        if _state["calls"] <= failures:
            raise ConnectionError(f"failure {_state['calls']}")
        return result
    return _fetch, _state
_slept = []
_f, _st = _flaky(3)
_start = _time.perf_counter()
_r = fetch_with_retry(_f, 5, 1.0, sleep=_slept.append, rng=_HalfRng())
assert _r == "data" and _st["calls"] == 4, f"Three failures then success: 4 calls, result 'data'; got {_r!r} after {_st['calls']} calls."
assert _slept == [1.5, 2.5, 4.5], f"Delays should be 1·2^i + 0.5 for i = 0, 1, 2: [1.5, 2.5, 4.5]; got {_slept}."
assert _time.perf_counter() - _start < 0.5, "Use the injected sleep, never time.sleep directly."
_slept = []
_f, _st = _flaky(10)
try:
    fetch_with_retry(_f, 3, 0.2, sleep=_slept.append, rng=_HalfRng())
    assert False, "After 3 failed attempts, the last ConnectionError should be raised."
except ConnectionError as _e:
    assert str(_e) == "failure 3", f"Re-raise the last error; got {_e}."
assert _st["calls"] == 3 and len(_slept) == 2, f"3 attempts mean 3 calls and 2 waits (none after the final failure); got {_st['calls']} calls and waits {_slept}."
_slept = []
_f, _st = _flaky(0, result=42)
assert fetch_with_retry(_f, 3, 1.0, sleep=_slept.append, rng=_HalfRng()) == 42 and _slept == [], "Success first time: no waiting."
def _broken():
    raise ValueError("bad request")
_slept = []
try:
    fetch_with_retry(_broken, 5, 1.0, sleep=_slept.append, rng=_HalfRng())
    assert False, "A ValueError is not a connection problem: let it propagate."
except ValueError:
    assert _slept == [], "Do not retry or wait on errors other than ConnectionError."
class _ZeroRng:
    def uniform(self, a, b):
        return a
_slept = []
_f, _st = _flaky(4)
fetch_with_retry(_f, 5, 0.1, sleep=_slept.append, rng=_ZeroRng())
assert [round(_d, 6) for _d in _slept] == [0.1, 0.2, 0.4, 0.8], f"With no jitter the delays double: [0.1, 0.2, 0.4, 0.8]; got {_slept}."
"SUCCESS: With sleep and randomness injected, a test checked every delay of a retry loop that would take seconds to run for real, in no time at all."
```

Hint: Loop `for i in range(attempts)`, with `return fetch()` inside `try`. In `except ConnectionError`, re-raise with a bare `raise` if `i == attempts - 1`; otherwise call `sleep(base_delay * 2 ** i + rng.uniform(0, base_delay))`. Catching only `ConnectionError` lets every other exception propagate.
:::

## What you learned

- A hidden dependency is anything code fetches for itself, such as the clock, global data, the network or `sleep`. It makes results depend on the outside world and blocks testing.
- Dependency injection passes collaborators in, through the constructor or as function arguments, so the important logic depends only on small interfaces. That is dependency inversion in practice.
- Test doubles stand in for real collaborators: stubs return fixed answers, fakes are simple working versions, spies record their calls, mocks check calls against expectations. If a double is hard to write, the interface is too big.
- A default argument can supply the real dependency, but it is created once at definition time: pass `datetime.now`, not `datetime.now()`.
- Real collaborators are created in one place, the composition root, and passed down. Python needs no framework for this.

The next lesson changes existing code safely: recognising code smells and refactoring in small steps, with tests checking that behaviour stays the same.
