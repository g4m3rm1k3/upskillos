# Proxy

A **proxy** is a stand-in with the same interface as the real object, placed in front of it to control access. The caller talks to the proxy exactly as it would to the real thing. The proxy decides **when** and **whether** the real object is used. It may delay creating the real object until someone needs it, answer repeated questions from a cache, check permissions first, or forward calls across a network.

Structurally, a proxy looks like a decorator: a wrapper with the same interface. The difference is intent. A decorator **adds behaviour** to what the object does. A proxy **controls access** to the object, and often manages its lifetime, without changing what the object does when it is reached.

This lesson covers:

- the virtual proxy: create an expensive object only when it is first needed;
- the caching proxy: answer repeated requests without asking the slow original;
- the protection proxy: check permissions before forwarding a call;
- Python's built-in help: `functools.cached_property` and `__getattr__` forwarding.

## The virtual proxy: load only when needed

A CAD program opens a project containing hundreds of drawings. Loading a drawing parses a large file and takes noticeable time, but a user opening the project usually looks at only one or two drawings. If the project loads every drawing up front, opening it is slow for no reason. A **virtual proxy** holds just what is needed to load the drawing later (here, a loader function and a name). It loads the real drawing the first time any method needs it, and reuses it after that. Predict before running: how many drawings are loaded to show the title list and render one drawing?

```python type
loads = []

class Drawing:
    def __init__(self, name):
        loads.append(name)
        self.name = name
        self.entities = [f"line {i}" for i in range(1000)]
    def render(self):
        return f"{self.name}: {len(self.entities)} entities drawn"
    def entity_count(self):
        return len(self.entities)

class LazyDrawing:
    def __init__(self, name, loader=Drawing):
        self.name = name
        self._loader = loader
        self._real = None
    def _drawing(self):
        if self._real is None:
            self._real = self._loader(self.name)
        return self._real
    def render(self):
        return self._drawing().render()
    def entity_count(self):
        return self._drawing().entity_count()

project = [LazyDrawing(f"sheet-{n:03d}") for n in range(1, 301)]
print("titles:", [d.name for d in project[:3]], "...")
print("loaded so far:", len(loads))
print(project[41].render())
print(project[41].entity_count(), "entities; loaded so far:", loads)
```

```output
titles: ['sheet-001', 'sheet-002', 'sheet-003'] ...
loaded so far: 0
sheet-042: 1000 entities drawn
1000 entities; loaded so far: ['sheet-042']
```

`self.name` is kept on the proxy itself, so listing titles needs no loading at all. Only methods that need the drawing's contents go through `_drawing()`.

Opening a 300-drawing project loaded nothing, and showing one drawing loaded one, once, even though it was used twice. The rest of the program cannot tell a `LazyDrawing` from a `Drawing`: it calls `render` and `entity_count` either way.

## The caching proxy: don't ask twice

A supplier's price service is slow (here, simulated with a counter of real requests), and prices change only occasionally. A **caching proxy** keeps each answer for a while and replies from memory. A cache must know when its answers go stale. A **time-to-live** (TTL) does that: an entry older than the TTL is fetched again. To make that testable, the clock is injected, as in the dependency injection lesson. Predict before running: how many real requests do these six lookups make?

```python type
class PriceService:
    def __init__(self):
        self.requests = 0
    def price(self, sku):
        self.requests += 1
        return {"bolt": 0.40, "nut": 0.15, "bearing": 6.50}[sku]

class CachedPrices:
    def __init__(self, service, ttl_seconds, clock):
        self._service, self._ttl, self._clock = service, ttl_seconds, clock
        self._cache = {}
    def price(self, sku):
        now = self._clock()
        if sku in self._cache:
            value, fetched_at = self._cache[sku]
            if now - fetched_at < self._ttl:
                return value
        value = self._service.price(sku)
        self._cache[sku] = (value, now)
        return value

now = [0]
service = CachedPrices(PriceService(), ttl_seconds=60, clock=lambda: now[0])
for t, sku in [(0, "bolt"), (5, "bolt"), (10, "nut"), (30, "bolt"), (61, "bolt"), (65, "nut")]:
    now[0] = t
    service.price(sku)
print("real requests:", service._service.requests)
```

```output
real requests: 3
```

`now` is a one-item list so the lambda always sees the latest time: the loop changes `now[0]`, and the clock reads it.

Three real requests for six lookups: the bolt at 0 s, the nut at 10 s, and the bolt again at 61 s, when its cached price from 0 s had expired. The lookups at 5 and 30 s came from the cache, and so did the nut at 65 s: fetched at 10 s, it was only 55 s old. The TTL is a trade-off chosen per use: longer saves more requests but serves older prices.

## The protection proxy: check before forwarding

A machine controller offers `start`, `stop` and `set_feed_override`. Operators may start and stop, only engineers may change the feed override, and visitors may do neither. Putting those checks inside the controller mixes access rules into machine logic. A **protection proxy** wraps the controller, holds the user's role, and checks each call against a permission table before forwarding it. Predict before running: which of the four calls succeed?

```python type
class Controller:
    def __init__(self):
        self.running, self.override = False, 100
    def start(self):
        self.running = True
        return "started"
    def stop(self):
        self.running = False
        return "stopped"
    def set_feed_override(self, percent):
        self.override = percent
        return f"override {percent}%"

PERMISSIONS = {
    "operator": {"start", "stop"},
    "engineer": {"start", "stop", "set_feed_override"},
    "visitor": set(),
}

class GuardedController:
    def __init__(self, controller, role):
        self._controller, self._role = controller, role

    def __getattr__(self, name):
        if name not in PERMISSIONS[self._role]:
            raise PermissionError(f"role {self._role!r} may not call {name}")
        return getattr(self._controller, name)

machine = Controller()
as_operator = GuardedController(machine, "operator")
as_engineer = GuardedController(machine, "engineer")
for action in [lambda: as_operator.start(), lambda: as_operator.set_feed_override(120),
               lambda: as_engineer.set_feed_override(120), lambda: GuardedController(machine, "visitor").stop()]:
    try:
        print(action())
    except PermissionError as error:
        print("PermissionError:", error)
print("machine state:", machine.running, machine.override)
```

```output
started
PermissionError: role 'operator' may not call set_feed_override
override 120%
PermissionError: role 'visitor' may not call stop
machine state: True 120
```

`__getattr__` runs for every attribute the proxy does not define itself, which here is every controller method. So the check happens in one place for all of them, including methods added to the controller later. Those are denied until someone adds them to the permission table: safe by default.

The operator started the machine but was refused the override. The engineer changed it. The visitor could not even stop the machine. The controller contains no permission code at all, and the same controller object is reached through different proxies for different users.

## Python's built-in help

Two standard tools cover common proxy needs with less code.

**`functools.cached_property`** turns a method into an attribute computed on first access and then stored on the object: a virtual proxy for one expensive value, written as a decorator.

**`__getattr__` forwarding**, as in the protection proxy, makes a proxy pass through every name it does not handle itself, so it does not need a method per method of the real object. (One caution: Python looks special methods such as `__len__` and `__iter__` up on the class, not through `__getattr__`. A proxy that must support `len()` or iteration has to define those methods explicitly.)

```python type
from functools import cached_property

class Inspection:
    def __init__(self, readings):
        self.readings = readings
    @cached_property
    def statistics(self):
        print("  (computing statistics)")
        n = len(self.readings)
        mean = sum(self.readings) / n
        return {"n": n, "mean": round(mean, 3), "spread": round(max(self.readings) - min(self.readings), 3)}

report = Inspection([10.01, 9.99, 10.02, 10.00])
print(report.statistics["mean"], report.statistics["spread"])
```

```output
  (computing statistics)
10.005 0.03
```

The message prints once: the second access found the stored result. Note that `cached_property` never expires by itself. `del report.statistics` forces a recompute on the next access, but nothing does it automatically. For values that go stale over time, use a TTL cache like the one above.

::: challenge A lazy loader [easy]
Machine manuals are large PDFs, and an operator usually opens one at most. Write `LazyManual(machine, loader)`. `loader(machine)` returns the real manual object (with methods `page(n)` and `page_count()`) and is slow. The proxy must:

- keep `machine` as an attribute, available without loading;
- call `loader` only on the first call to `page` or `page_count`, and never again;
- forward `page(n)` and `page_count()` to the loaded manual.

```python starter
class LazyManual:
    def __init__(self, machine, loader):
        self.machine = machine
        self._manual = loader(machine)
    def page(self, n):
        return self._manual.page(n)
    def page_count(self):
        return self._manual.page_count()

print("make LazyManual lazy")
```

```python solution
class LazyManual:
    def __init__(self, machine, loader):
        self.machine = machine
        self._loader = loader
        self._manual = None

    def _real(self):
        if self._manual is None:
            self._manual = self._loader(self.machine)
        return self._manual

    def page(self, n):
        return self._real().page(n)

    def page_count(self):
        return self._real().page_count()

print("LazyManual ready")
```

```python test
assert "LazyManual" in dir(), "Keep the class name LazyManual."
_loaded = []
class _Manual:
    def __init__(self, machine):
        self.machine = machine
    def page(self, n):
        return f"{self.machine} manual, page {n}"
    def page_count(self):
        return 240
def _loader(machine):
    _loaded.append(machine)
    return _Manual(machine)
_manuals = [LazyManual(f"lathe-{i}", _loader) for i in range(50)]
assert _loaded == [], f"Creating proxies must not load anything; {len(_loaded)} were loaded."
assert _manuals[7].machine == "lathe-7" and _loaded == [], "machine is available without loading."
assert _manuals[7].page(12) == "lathe-7 manual, page 12" and _manuals[7].page_count() == 240, "Calls are forwarded to the real manual."
assert _manuals[7].page(1) and _loaded == ["lathe-7"], f"Only the manual used is loaded, exactly once; loaded {_loaded}."
_manuals[3].page_count()
assert _loaded == ["lathe-7", "lathe-3"], "page_count also loads on first use."
"SUCCESS: Fifty proxies cost nothing until a page is asked for, and each manual is loaded at most once."
```

Hint: Store the loader and set the manual to `None` in `__init__`. A helper method loads it if it is still `None` and returns it; `page` and `page_count` call the helper and forward.
:::

::: challenge A caching proxy with invalidation [medium]
Write `CachedLookup(source, ttl_seconds, clock)`, a caching proxy for any object with a `get(key)` method. Its `get(key)` returns a cached value if it was fetched less than `ttl_seconds` ago (measured with `clock()`), and otherwise asks `source.get(key)` and caches the answer with the time. Also write:

- `invalidate(key)`: forget one cached key (no error if it is not cached);
- `clear()`: forget everything;
- `stats()`: a dict `{"hits": h, "misses": m}` counting answers served from the cache and fetched from the source.

If `source.get` raises, the error must reach the caller and nothing may be cached for that key.

```python starter
class CachedLookup:
    def __init__(self, source, ttl_seconds, clock):
        self.source = source
    def get(self, key):
        return self.source.get(key)

print("write CachedLookup")
```

```python solution
class CachedLookup:
    def __init__(self, source, ttl_seconds, clock):
        self._source, self._ttl, self._clock = source, ttl_seconds, clock
        self._cache = {}
        self._hits = self._misses = 0

    def get(self, key):
        now = self._clock()
        if key in self._cache:
            value, at = self._cache[key]
            if now - at < self._ttl:
                self._hits += 1
                return value
        value = self._source.get(key)
        self._misses += 1
        self._cache[key] = (value, now)
        return value

    def invalidate(self, key):
        self._cache.pop(key, None)

    def clear(self):
        self._cache.clear()

    def stats(self):
        return {"hits": self._hits, "misses": self._misses}

print("CachedLookup ready")
```

```python test
assert "CachedLookup" in dir(), "Keep the class name CachedLookup."
class _Source:
    def __init__(self):
        self.asked = []
        self.data = {"a": 1, "b": 2}
    def get(self, key):
        self.asked.append(key)
        if key not in self.data:
            raise KeyError(key)
        return self.data[key]
_t = [0]
_src = _Source()
_c = CachedLookup(_src, 10, lambda: _t[0])
assert _c.get("a") == 1 and _c.get("a") == 1 and _src.asked == ["a"], "The second request within the TTL comes from the cache."
_t[0] = 9
assert _c.get("a") == 1 and _src.asked == ["a"], "9 s later is still within a 10 s TTL."
_t[0] = 10
_src.data["a"] = 5
assert _c.get("a") == 5 and _src.asked == ["a", "a"], "At exactly the TTL, the entry has expired: fetch again."
assert _c.stats() == {"hits": 2, "misses": 2}, f"Two hits and two misses so far; got {_c.stats()}."
_src.data["b"] = 3
_c.get("b"); _c.invalidate("b"); _c.invalidate("never-cached")
assert _c.get("b") == 3 and _src.asked.count("b") == 2, "invalidate forces the next get to ask the source."
_c.clear()
_c.get("a"); _c.get("b")
assert _src.asked[-2:] == ["a", "b"], "clear forgets everything."
try:
    _c.get("zzz")
    assert False, "A failing source lookup should raise to the caller."
except KeyError:
    pass
_src.data["zzz"] = 26
assert _c.get("zzz") == 26, "Nothing should have been cached for the failed key."
"SUCCESS: The proxy answers from memory while it can, refetches when entries expire or are invalidated, and never caches a failure."
```

Hint: Store `(value, time)` per key. In `get`, return the cached value if it exists and `now - time < ttl` (counting a hit); otherwise call the source **before** touching the cache, so a raised error leaves it unchanged, then store and count a miss. `invalidate` can use `dict.pop(key, None)`.
:::

::: challenge A protection proxy with an audit trail [hard]
Write `GuardedRecipeStore(store, user, rules)`. `store` is any object with methods `read(name)`, `write(name, recipe)` and `delete(name)`. `user` is a dict with `"name"` and `"role"`. `rules` maps each role to the set of method names that role may call. The proxy forwards permitted calls, with all their arguments, and raises `PermissionError` for forbidden ones, without calling the store. A role not in `rules` may call nothing. It also keeps an **audit trail**: every attempt, allowed or not, is appended to `self.audit` as a tuple `(user name, method name, "allowed" or "denied")`. Attributes that are not methods of the store, and names the store does not have at all, must raise `AttributeError`, with nothing written to the audit.

```python starter
class GuardedRecipeStore:
    def __init__(self, store, user, rules):
        self._store = store
        self.audit = []

print("write GuardedRecipeStore")
```

```python solution
class GuardedRecipeStore:
    def __init__(self, store, user, rules):
        self._store, self._user, self._rules = store, user, rules
        self.audit = []

    def __getattr__(self, name):
        target = getattr(self._store, name)
        if not callable(target):
            raise AttributeError(f"{name!r} is not an operation")
        allowed = name in self._rules.get(self._user["role"], set())
        self.audit.append((self._user["name"], name, "allowed" if allowed else "denied"))
        if not allowed:
            raise PermissionError(f"{self._user['name']} ({self._user['role']}) may not {name}")
        return target

print("GuardedRecipeStore ready")
```

```python test
assert "GuardedRecipeStore" in dir(), "Keep the class name GuardedRecipeStore."
class _Store:
    def __init__(self):
        self.recipes = {"weld-A": "90A, 12 mm/s"}
        self.calls = []
        self.capacity = 100
    def read(self, name):
        self.calls.append(("read", name))
        return self.recipes[name]
    def write(self, name, recipe):
        self.calls.append(("write", name))
        self.recipes[name] = recipe
    def delete(self, name):
        self.calls.append(("delete", name))
        del self.recipes[name]
_rules = {"operator": {"read"}, "engineer": {"read", "write"}, "admin": {"read", "write", "delete"}}
_s = _Store()
_op = GuardedRecipeStore(_s, {"name": "Ana", "role": "operator"}, _rules)
_eng = GuardedRecipeStore(_s, {"name": "Ben", "role": "engineer"}, _rules)
assert _op.read("weld-A") == "90A, 12 mm/s", "Operators may read."
try:
    _op.write("weld-A", "120A")
    assert False, "Operators may not write."
except PermissionError:
    pass
assert _s.recipes["weld-A"] == "90A, 12 mm/s" and ("write", "weld-A") not in _s.calls, "A denied call must not reach the store."
_eng.write("weld-B", recipe="110A, 9 mm/s")
assert _s.recipes["weld-B"] == "110A, 9 mm/s", "Permitted calls forward all arguments, including keywords."
try:
    _eng.delete("weld-A")
    assert False, "Engineers may not delete."
except PermissionError:
    pass
assert _op.audit == [("Ana", "read", "allowed"), ("Ana", "write", "denied")], f"Ana's audit: {_op.audit}."
assert _eng.audit == [("Ben", "write", "allowed"), ("Ben", "delete", "denied")], f"Ben's audit: {_eng.audit}."
_guest = GuardedRecipeStore(_s, {"name": "Cy", "role": "guest"}, _rules)
try:
    _guest.read("weld-A")
    assert False, "A role with no rules may call nothing."
except PermissionError:
    pass
assert _guest.audit == [("Cy", "read", "denied")], "Denied attempts are audited too."
for _name in ["capacity", "fly"]:
    try:
        getattr(_eng, _name)
        assert False, f"{_name!r} is not an operation of the store: raise AttributeError."
    except AttributeError:
        pass
assert len(_eng.audit) == 2, "Non-operations should not be written to the audit."
"SUCCESS: Every request passes one checkpoint that enforces the rules and records the attempt, and the store itself contains no permission code."
```

Hint: Put everything in `__getattr__(self, name)`. First `getattr(self._store, name)` (which raises `AttributeError` for unknown names), then refuse non-callables with `AttributeError`. Look up whether the role allows `name`, append the audit tuple, raise `PermissionError` if denied, and otherwise return the store's bound method, which the caller then calls with its arguments.
:::

## What you learned

- A proxy has the same interface as the real object and controls access to it: when it is created, whether a call reaches it, and whether an answer can come from somewhere cheaper.
- A virtual proxy creates an expensive object on first use. A caching proxy answers repeats from memory, with a time-to-live and invalidation so answers do not go stale. A protection proxy checks permissions before forwarding, keeping access rules out of the real object.
- `__getattr__` forwarding puts one checkpoint in front of every method, including ones added later. Special methods such as `__len__` bypass it and must be defined explicitly.
- `functools.cached_property` is a one-line virtual proxy for an expensive attribute; it is recomputed only if you delete it.

The next lesson separates an abstraction from its implementation so that both can vary independently: the bridge pattern.
