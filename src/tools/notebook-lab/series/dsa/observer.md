# Observer

When something happens in a program, such as a temperature reading crossing a limit, a job finishing or a part being rejected, several other parts usually care. The dashboard redraws, the log records it, the alarm sounds. If the code where the event happens calls each of them directly, it must know all of them, and every new interested party means editing it. The **observer** pattern turns this around. The object where events happen (the **subject**) keeps a list of **observers** that have subscribed, and notifies each of them when something happens, without knowing what they are or what they do.

This is the first of the **behavioural** patterns, which are about how objects communicate and share responsibility. Observer is everywhere: GUI button clicks, spreadsheet cells that recalculate, "webhooks" on websites, and message systems between programs are all versions of it, often called **publish/subscribe**.

This lesson covers:

- the problem: an event source hard-wired to everything that reacts to it;
- the observer pattern: subscribe, unsubscribe, notify;
- the real-world pitfalls: one failing observer, unsubscribing while being notified, and objects kept alive by subscriptions;
- topics: an event bus that routes events by name.

## The problem: the sensor that knows everyone

A temperature sensor class records readings. Over time, more and more code wants to know about new readings, and each time someone adds a call inside `record`. Predict before reading on: what must change to add an SMS alert, and what does testing `record` alone require?

```python type
class Dashboard:
    def show(self, value):
        print(f"  dashboard: {value} °C")

class Logger:
    def __init__(self):
        self.lines = []
    def log(self, value):
        self.lines.append(f"reading {value}")

class Alarm:
    def check(self, value):
        if value > 80:
            print(f"  ALARM: {value} °C")

class HardWiredSensor:
    def __init__(self, dashboard, logger, alarm):
        self.dashboard, self.logger, self.alarm = dashboard, logger, alarm
    def record(self, value):
        self.dashboard.show(value)
        self.logger.log(value)
        self.alarm.check(value)

sensor = HardWiredSensor(Dashboard(), Logger(), Alarm())
sensor.record(72)
sensor.record(85)
```

```output
  dashboard: 72 °C
  dashboard: 85 °C
  ALARM: 85 °C
```

The sensor's job is to record readings, yet it depends on three unrelated classes and knows how to talk to each. An SMS alert means editing the sensor and its constructor. A test of `record` needs a dashboard, a logger and an alarm, or stand-ins for all three. The dependency points the wrong way: the general-purpose sensor depends on the specific uses of its data.

## Subscribe, unsubscribe, notify

The subject keeps a list of observers. In Python an observer is usually just a **callable**: a function, a lambda or a bound method that takes the event's data. `subscribe` adds one, `unsubscribe` removes it, and the subject calls every subscriber when something happens. The sensor now knows nothing about dashboards or alarms. Predict before running: after the alarm unsubscribes, what does the second reading trigger?

```python type
class Sensor:
    def __init__(self, name):
        self.name = name
        self._observers = []

    def subscribe(self, observer):
        self._observers.append(observer)

    def unsubscribe(self, observer):
        self._observers.remove(observer)

    def record(self, value):
        for observer in self._observers:
            observer(self.name, value)

def show(name, value):
    print(f"  dashboard: {name} {value} °C")

log_lines = []
def log(name, value):
    log_lines.append(f"{name} reading {value}")

def alarm(name, value):
    if value > 80:
        print(f"  ALARM: {name} at {value} °C")

oven = Sensor("oven")
for observer in [show, log, alarm]:
    oven.subscribe(observer)
oven.record(85)
oven.unsubscribe(alarm)
oven.record(90)
oven.subscribe(lambda name, value: print(f"  sms to on-call: {name} {value}") if value > 88 else None)
oven.record(91)
print(log_lines)
```

```output
  dashboard: oven 85 °C
  ALARM: oven at 85 °C
  dashboard: oven 90 °C
  dashboard: oven 91 °C
  sms to on-call: oven 91
['oven reading 85', 'oven reading 90', 'oven reading 91']
```

The SMS alert was added as a lambda, without touching `Sensor`. A bound method such as `logger.log` works as an observer too, since it is a callable that remembers its object.

After unsubscribing, the alarm stays quiet at 90 °C, and the SMS observer, added later, fires at 91 °C. A test of `Sensor` now needs one fake observer that records what it receives. The sensor defines the shape of its events, `(name, value)`, and anyone can listen.

## The pitfalls

The naive version above has three problems that real observer systems must solve.

**One failing observer stops the rest.** If the dashboard raises an exception, the loop ends there and the log and alarm never hear about the reading. The alarm may be the one that matters most. Usually each observer should be called inside its own `try`/`except`, with failures collected or logged, so that one broken listener cannot silence the others.

**Unsubscribing during notification.** An observer that unsubscribes itself while being notified, which is common for "notify me once" listeners, changes the list while the loop is running over it, and Python then skips the next observer. Looping over a **copy** of the list, `list(self._observers)`, avoids it.

**Subscriptions keep objects alive.** The subject's list holds a reference to each observer, and through a bound method, to its object. A dashboard window that is closed but never unsubscribed stays in memory, and keeps receiving events, for as long as the sensor lives. The remedies are to always unsubscribe (returning an "unsubscribe" function from `subscribe` makes that easy), or to hold observers through **weak references** (`weakref.WeakMethod`), which do not keep their objects alive. That only suits bound methods: a lambda or inner function held only weakly would vanish at once and never fire.

Predict before running: in the naive sensor, which observers hear about the reading when the first one fails, and which hear about it in the robust version?

```python type
class RobustSensor(Sensor):
    def subscribe(self, observer):
        self._observers.append(observer)
        return lambda: self.unsubscribe(observer)

    def record(self, value):
        errors = []
        for observer in list(self._observers):
            try:
                observer(self.name, value)
            except Exception as error:
                errors.append((getattr(observer, "__name__", "observer"), error))
        return errors

heard = []
def broken_dashboard(name, value):
    raise ConnectionError("display offline")
def once(name, value):
    heard.append(("once", value))
    stop_once()
def logger(name, value):
    heard.append(("log", value))

naive = Sensor("press")
for observer in [broken_dashboard, logger]:
    naive.subscribe(observer)
try:
    naive.record(50)
except ConnectionError:
    print("naive: the exception stopped notification; heard =", heard)

robust = RobustSensor("press")
robust.subscribe(broken_dashboard)
stop_once = robust.subscribe(once)
robust.subscribe(logger)
print("robust errors:", robust.record(60))
robust.record(61)
print("heard:", heard)
```

```output
naive: the exception stopped notification; heard = []
robust errors: [('broken_dashboard', ConnectionError('display offline'))]
heard: [('once', 60), ('log', 60), ('log', 61)]
```

`subscribe` now returns a function that undoes the subscription, so the caller needs nothing else to clean up later.

The naive sensor's logger never heard the reading. The robust sensor reports the dashboard's failure and still notifies the rest. The `once` observer unsubscribed itself during the first notification without making the loop skip the logger, so it heard only reading 60, while the logger heard both.

## Topics: an event bus

As a system grows, many subjects and many observers end up connected. An **event bus** puts one object in the middle. Publishers send events to a **topic** name, such as `"oven.temperature"` or `"job.finished"`, and subscribers register interest in topics. Neither side knows the other exists: they only agree on topic names and on the shape of each event's data. This is publish/subscribe, the form observer takes in larger systems and between separate programs (message brokers such as MQTT, common in factories, work this way). Predict before running: who hears the press-shop event?

```python type
from collections import defaultdict

class EventBus:
    def __init__(self):
        self._subscribers = defaultdict(list)
    def subscribe(self, topic, handler):
        self._subscribers[topic].append(handler)
    def publish(self, topic, **data):
        for handler in list(self._subscribers[topic]):
            handler(topic, **data)

bus = EventBus()
received = []
bus.subscribe("job.finished", lambda topic, **d: received.append(f"MES records job {d['job']}"))
bus.subscribe("job.finished", lambda topic, **d: received.append(f"label printer prints {d['job']}"))
bus.subscribe("oven.temperature", lambda topic, **d: received.append(f"oven chart plots {d['celsius']}"))
bus.publish("job.finished", job="J-2207", cell="press shop")
bus.publish("oven.temperature", celsius=182)
bus.publish("door.opened", door="north")
print(received)
```

```output
['MES records job J-2207', 'label printer prints J-2207', 'oven chart plots 182']
```

`defaultdict(list)` creates an empty list the first time a topic is used, so publishing to a topic nobody subscribed to just notifies no one.

Both job subscribers heard the finished job, the oven chart heard only the temperature, and the door event reached nobody, which is fine. The decoupling has a cost: following what happens after an event means searching for who subscribes to its topic, rather than reading one function. Observer trades directness for flexibility. Use it when the set of listeners really does vary.

::: challenge A signal with disconnect handles [easy]
Write a class `Signal` for one kind of event. `connect(handler)` adds a callable and returns a function that, when called, disconnects that handler (calling it a second time does nothing). `emit(*args, **kwargs)` calls every connected handler with those arguments, in the order they were connected, and returns how many handlers were called. A handler connected twice is called twice.

```python starter
class Signal:
    def __init__(self):
        self.handlers = []
    def emit(self, *args, **kwargs):
        return 0

print(Signal().emit(1))
```

```python solution
class Signal:
    def __init__(self):
        self._connections = []

    def connect(self, handler):
        connection = (object(), handler)
        self._connections.append(connection)
        def disconnect():
            self._connections = [c for c in self._connections if c[0] is not connection[0]]
        return disconnect

    def emit(self, *args, **kwargs):
        connections = list(self._connections)
        for _, handler in connections:
            handler(*args, **kwargs)
        return len(connections)

job_done = Signal()
stop = job_done.connect(lambda job: print("finished", job))
print(job_done.emit("J-1"))
stop()
print(job_done.emit("J-2"))
```

```python test
assert "Signal" in dir(), "Keep the class name Signal."
_s = Signal()
_got = []
_d1 = _s.connect(lambda x, unit="mm": _got.append(("a", x, unit)))
_d2 = _s.connect(lambda x, unit="mm": _got.append(("b", x, unit)))
assert callable(_d1), "connect should return a function that disconnects."
assert _s.emit(5, unit="in") == 2 and _got == [("a", 5, "in"), ("b", 5, "in")], f"Handlers run in order with all arguments; got {_got}."
_d1(); _d1()
_got.clear()
assert _s.emit(7) == 1 and _got == [("b", 7, "mm")], "After disconnecting a, only b runs; disconnecting twice is harmless."
_twice = []
_h = lambda: _twice.append(1)
_s2 = Signal()
_s2.connect(_h); _s2.connect(_h)
assert _s2.emit() == 2 and len(_twice) == 2, "A handler connected twice is called twice."
_s4 = Signal()
_dup = lambda: None
_first_handle = _s4.connect(_dup); _s4.connect(_dup)
_first_handle(); _first_handle()
assert _s4.emit() == 1, "Each disconnect function removes only its own connection, even if the same handler is connected twice."
_s3 = Signal()
_order = []
def _first():
    _order.append("first"); _stop_first()
_stop_first = _s3.connect(_first)
_s3.connect(lambda: _order.append("second"))
_s3.emit(); _s3.emit()
assert _order == ["first", "second", "second"], f"A handler that disconnects itself during emit must not make the next one skip; got {_order}."
assert Signal().emit() == 0, "No handlers, nothing called."
"SUCCESS: Handlers subscribe and leave through the handle they were given, and emitting over a copy means leaving mid-emit never skips anyone."
```

Hint: Keep a list of connections, each a pair of a unique token (`object()`) and the handler, so a handler connected twice has two separate entries. `connect` returns an inner function that removes the entry with its own token. `emit` copies the list first, calls each handler with `*args, **kwargs`, and returns how many it called.
:::

::: challenge Change-only notifications [medium]
A temperature controller should not flood its observers with readings that barely change. Write `Thermostat(deadband)` with `subscribe(observer)` and `update(reading)`. Observers are called as `observer(old, new)`, and only when the reading has moved **more than** `deadband` away from the last value that was announced. The first reading is always announced, with `old` as `None`. `update` returns True if it notified observers and False if it did not. Each observer is called inside its own `try`/`except Exception`, so one failing observer never stops the others, and failures are added to a list attribute `errors` as the exception objects.

```python starter
class Thermostat:
    def __init__(self, deadband):
        self.deadband = deadband

print("write Thermostat")
```

```python solution
class Thermostat:
    def __init__(self, deadband):
        self.deadband = deadband
        self._observers = []
        self._announced = None
        self.errors = []

    def subscribe(self, observer):
        self._observers.append(observer)

    def update(self, reading):
        if self._announced is not None and abs(reading - self._announced) <= self.deadband:
            return False
        old, self._announced = self._announced, reading
        for observer in list(self._observers):
            try:
                observer(old, reading)
            except Exception as error:
                self.errors.append(error)
        return True

t = Thermostat(0.5)
t.subscribe(lambda old, new: print("changed", old, "->", new))
for r in [20.0, 20.3, 20.6, 20.4, 21.2]:
    t.update(r)
```

```python test
assert "Thermostat" in dir(), "Keep the class name Thermostat."
_t = Thermostat(0.5)
_seen = []
_t.subscribe(lambda old, new: _seen.append((old, new)))
_results = [_t.update(_r) for _r in [20.0, 20.3, 20.5, 20.6, 20.4, 21.2, 21.0, 20.6]]
assert _seen == [(None, 20.0), (20.0, 20.6), (20.6, 21.2), (21.2, 20.6)], f"Announce only moves of more than 0.5 from the last announced value; got {_seen}."
assert _results == [True, False, False, True, False, True, False, True], f"update reports whether it notified; got {_results}."
_t2 = Thermostat(1)
_ok = []
def _bad(old, new):
    raise RuntimeError("chart crashed")
_t2.subscribe(_bad)
_t2.subscribe(lambda old, new: _ok.append(new))
_t2.update(10); _t2.update(15)
assert _ok == [10, 15], "A failing observer must not stop the others."
assert len(_t2.errors) == 2 and all(isinstance(_e, RuntimeError) for _e in _t2.errors), "Failures are collected in errors."
_t3 = Thermostat(0)
_n = []
_t3.subscribe(lambda o, n: _n.append(n))
for _r in [5, 5, 5.0001, 5.0001]:
    _t3.update(_r)
assert _n == [5, 5.0001], "With a deadband of 0, any change is announced, but a repeat is not."
"SUCCESS: Observers hear about real changes only, measured from what they were last told, and one broken observer can't silence the rest."
```

Hint: Remember the last **announced** value, not the last reading. Skip (return False) when it exists and `abs(reading - announced) <= deadband`. Otherwise update it, then call each observer over a copy of the list inside `try`/`except Exception`, appending errors.
:::

::: challenge An event bus with wildcards and one-shot handlers [hard]
Write `EventBus` with:

- `subscribe(pattern, handler, once=False)`: register a handler for a topic pattern and return an unsubscribe function (calling it again does nothing). A pattern is either an exact topic such as `"machine.3.fault"`, or ends in `".*"` to match every topic that starts with the part before it plus a dot (`"machine.*"` matches `"machine.3.fault"` and `"machine.7.idle"`, but not `"machines.x"` or `"machine"`); `"*"` alone matches every topic. With `once=True` the handler is removed automatically after its first call;
- `publish(topic, payload)`: call every matching handler as `handler(topic, payload)`, in the order they subscribed. A handler that raises must not stop the others: collect `(topic, exception)` pairs in a list attribute `failures`. Return the number of handlers called (including ones that raised);
- unsubscribing, including a handler unsubscribing itself or another handler during `publish`, must be safe: handlers removed during a publish that have not run yet are **not** called.

```python starter
class EventBus:
    def publish(self, topic, payload):
        return 0

print(EventBus().publish("machine.1.idle", {}))
```

```python solution
class EventBus:
    def __init__(self):
        self._subscriptions = []
        self.failures = []

    def subscribe(self, pattern, handler, once=False):
        entry = [pattern, handler, once, True]
        self._subscriptions.append(entry)
        def unsubscribe():
            if entry[3]:
                entry[3] = False
                self._subscriptions.remove(entry)
        entry.append(unsubscribe)
        return unsubscribe

    @staticmethod
    def _matches(pattern, topic):
        if pattern == "*":
            return True
        if pattern.endswith(".*"):
            return topic.startswith(pattern[:-1])
        return pattern == topic

    def publish(self, topic, payload):
        called = 0
        for entry in list(self._subscriptions):
            pattern, handler, once, active, unsubscribe = entry
            if not entry[3] or not self._matches(pattern, topic):
                continue
            if once:
                unsubscribe()
            called += 1
            try:
                handler(topic, payload)
            except Exception as error:
                self.failures.append((topic, error))
        return called

bus = EventBus()
bus.subscribe("machine.*", lambda t, p: print("machine event", t, p))
bus.subscribe("machine.3.fault", lambda t, p: print("page the engineer"), once=True)
print(bus.publish("machine.3.fault", {"code": 17}), bus.publish("machine.3.fault", {"code": 18}))
```

```python test
assert "EventBus" in dir(), "Keep the class name EventBus."
_b = EventBus()
_log = []
_b.subscribe("machine.*", lambda t, p: _log.append(("all", t)))
_b.subscribe("machine.3.fault", lambda t, p: _log.append(("m3", p["code"])))
_b.subscribe("*", lambda t, p: _log.append(("audit", t)))
assert _b.publish("machine.3.fault", {"code": 17}) == 3 and _log == [("all", "machine.3.fault"), ("m3", 17), ("audit", "machine.3.fault")], f"Got {_log}."
_log.clear()
assert _b.publish("machines.x", {}) == 1 and _b.publish("machine", {}) == 1 and _log == [("audit", "machines.x"), ("audit", "machine")], "machine.* matches only topics starting with 'machine.'"
_b2 = EventBus()
_once = []
_b2.subscribe("job.done", lambda t, p: _once.append(p), once=True)
assert _b2.publish("job.done", 1) == 1 and _b2.publish("job.done", 2) == 0 and _once == [1], "A once handler runs a single time."
_b3 = EventBus()
_ran = []
_b3.subscribe("x", lambda t, p: (_ran.append("bad"), 1 / 0))
_b3.subscribe("x", lambda t, p: _ran.append("good"))
assert _b3.publish("x", None) == 2 and _ran == ["bad", "good"], "A raising handler must not stop the next one."
assert len(_b3.failures) == 1 and _b3.failures[0][0] == "x" and isinstance(_b3.failures[0][1], ZeroDivisionError), "Failures are recorded as (topic, exception)."
_b4 = EventBus()
_seq = []
def _first(t, p):
    _seq.append("first"); _stop_second()
_b4.subscribe("e", _first)
_stop_second = _b4.subscribe("e", lambda t, p: _seq.append("second"))
_b4.subscribe("e", lambda t, p: _seq.append("third"))
assert _b4.publish("e", None) == 2 and _seq == ["first", "third"], f"A handler removed mid-publish, before its turn, is not called; got {_seq}."
_u = _b4.subscribe("e", lambda t, p: _seq.append("late"))
_u(); _u()
_seq.clear(); _b4.publish("e", None)
assert _seq == ["first", "third"], "Unsubscribe functions work, and calling one twice is harmless."
"SUCCESS: Topics route events to whoever cares, one-shot and self-removing handlers are safe mid-publish, and one failure never silences the rest."
```

Hint: Store each subscription as a small mutable record (pattern, handler, once, still-active flag). Unsubscribing marks it inactive and removes it. `publish` loops over a **copy** of the list and skips records that are inactive or do not match. A once handler unsubscribes before it is called. For `".*"` patterns, match with `topic.startswith(pattern[:-1])`, which keeps the dot.
:::

## What you learned

- Observer lets a subject announce events to any number of subscribers without knowing who they are. New listeners subscribe; the subject never changes.
- In Python an observer is usually a callable: a function, lambda or bound method.
- Robust notification isolates each observer in `try`/`except`, loops over a copy of the subscriber list so that unsubscribing mid-notification is safe, and gives subscribers an easy way to unsubscribe (or holds them weakly) so subscriptions do not keep dead objects alive.
- An event bus routes events by topic, so publishers and subscribers only share topic names and event shapes: publish/subscribe.
- The cost is indirection: to see what an event causes, you must find its subscribers.

The next lesson turns requests themselves into objects, so they can be queued, logged, undone and redone: the command pattern.
