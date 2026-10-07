# Chain of responsibility

A purchase request for £300 can be approved by a team leader; £3,000 needs a manager; £30,000 needs a director. An alarm from a machine might be handled by the machine's own controller, escalated to the line supervisor, or, if nobody else can deal with it, sent to maintenance. In both cases a request travels along a sequence of possible handlers until one takes responsibility for it. The **chain of responsibility** pattern models exactly that. The sender passes its request to the first handler, and each handler either deals with it or passes it to the next. The sender does not know, or need to know, who finally handles it.

The same structure, with each link able to act **and** pass on, is how web frameworks process requests through **middleware**, how logging systems pass records through filters and handlers (where every link acts), and how GUI events bubble up from a button to its window.

This lesson covers:

- the problem: one function deciding who handles every kind of request;
- the chain as an ordered list of handlers, each trying in turn;
- handler objects linked to a successor, and rearranging the chain;
- middleware: links that do work before and after passing the request on.

## The problem: one function decides everything

An approval routine checks the amount against every level in turn. Predict before reading on: what has to change to add a "senior manager" level between manager and director, or to let the finance team handle anything marked "capital"?

```python type
def approve(amount, kind="consumables"):
    if amount <= 500:
        return "team leader"
    elif amount <= 5000:
        return "manager"
    elif amount <= 50000:
        return "director"
    else:
        return "board"

for amount in [120, 3200, 18000, 250000]:
    print(amount, "->", approve(amount))
```

```output
120 -> team leader
3200 -> manager
18000 -> director
250000 -> board
```

Every rule lives in one function, so each new level or special case means editing it, and the special cases ("capital items go to finance first") tangle with the thresholds. The approval levels cannot be configured per site, tested separately, or reordered without rewriting the function.

## A chain of handlers

Make each level a **handler**: a small function that either returns a result (it handled the request) or returns `None` (not mine, pass it on). The chain is an ordered list of handlers, and dispatching tries each in turn until one answers. Adding a level is inserting a handler, and different sites can use different chains. Predict before running: who approves the £8,000 capital purchase, and who approves it if the finance handler is left out?

```python type
def up_to(limit, approver):
    def handler(request):
        return approver if request["amount"] <= limit else None
    handler.__name__ = f"{approver} (up to {limit})"
    return handler

def capital_goes_to_finance(request):
    return "finance" if request.get("kind") == "capital" else None

def run_chain(chain, request):
    for handler in chain:
        result = handler(request)
        if result is not None:
            return result
    raise LookupError(f"nobody could handle {request}")

standard = [up_to(500, "team leader"), up_to(5000, "manager"), up_to(50000, "director"), up_to(float("inf"), "board")]
with_finance = [capital_goes_to_finance] + standard

for request in [{"amount": 120}, {"amount": 8000, "kind": "capital"}, {"amount": 250000}]:
    print(request, "->", run_chain(with_finance, request), "| without finance:", run_chain(standard, request))
try:
    run_chain([up_to(500, "team leader")], {"amount": 900})
except LookupError as error:
    print("LookupError:", error)
```

```output
{'amount': 120} -> team leader | without finance: team leader
{'amount': 8000, 'kind': 'capital'} -> finance | without finance: director
{'amount': 250000} -> board | without finance: board
LookupError: nobody could handle {'amount': 900}
```

`up_to` is a small factory that builds a threshold handler, so each level is one line. The final `float("inf")` level catches everything left, so no request falls off the end of the standard chain.

The capital purchase goes to finance when that handler is first in the chain, and to the director when it is not. The chain decides by **order**: the first handler able to answer wins. A request that no handler takes raises an error rather than vanishing. Whether a chain should fail loudly or have a catch-all at the end is a design decision, and it is worth making on purpose.

## Handler objects with a successor

The classic form links handler objects: each holds a reference to the **next** handler and calls it when it cannot deal with a request itself. This form suits handlers that keep state or configuration, and it lets a handler do something **and** pass the request on (log it, count it), not just one or the other. Predict before running: which handlers see the vibration alarm, and who resolves it?

```python type
class Handler:
    def __init__(self):
        self.next = None
    def then(self, handler):
        self.next = handler
        return handler
    def handle(self, alarm):
        if self.next is None:
            raise LookupError(f"unhandled alarm {alarm}")
        return self.next.handle(alarm)

class Recorder(Handler):
    def __init__(self):
        super().__init__()
        self.seen = []
    def handle(self, alarm):
        self.seen.append(alarm["code"])
        return super().handle(alarm)

class Controller(Handler):
    def handle(self, alarm):
        if alarm["severity"] <= 1:
            return f"controller auto-cleared {alarm['code']}"
        return super().handle(alarm)

class Supervisor(Handler):
    def handle(self, alarm):
        if alarm["severity"] <= 2 and alarm["category"] != "safety":
            return f"supervisor acknowledged {alarm['code']}"
        return super().handle(alarm)

class Maintenance(Handler):
    def handle(self, alarm):
        return f"maintenance ticket for {alarm['code']}"

recorder = Recorder()
recorder.then(Controller()).then(Supervisor()).then(Maintenance())
for alarm in [{"code": "E101", "severity": 1, "category": "process"},
              {"code": "V230", "severity": 2, "category": "vibration"},
              {"code": "S001", "severity": 2, "category": "safety"}]:
    print(recorder.handle(alarm))
print("recorder saw:", recorder.seen)
```

```output
controller auto-cleared E101
supervisor acknowledged V230
maintenance ticket for S001
recorder saw: ['E101', 'V230', 'S001']
```

`then` returns the handler it was given, so `a.then(b).then(c)` links a to b, then b to c.

Every alarm passes the recorder, which acts and passes it on. The controller clears severity 1. The supervisor takes the vibration alarm, but not the safety alarm of the same severity, which goes on to maintenance. Each handler's rule is in its own class, and the chain is assembled in one place, where it can be rearranged or extended without touching any handler.

## Middleware: acting before and after

A powerful variant gives each link a reference to "the rest of the chain" as a function, `next_step`. The link can act **before** calling it, act **after** it returns, change the request or the response, or not call it at all (to short-circuit). This is **middleware**, the structure behind web frameworks, where each request passes through layers for logging, authentication, caching and error handling on its way to the code that answers it. Each layer is independent, and the order of layers matters. Predict before running: which request never reaches the core handler, and what does the timing layer report for it?

```python type
import time

def timing(request, next_step):
    start = time.perf_counter()
    response = next_step(request)
    response["ms"] = round((time.perf_counter() - start) * 1000, 3)
    return response

def require_badge(request, next_step):
    if not request.get("badge"):
        return {"status": 403, "body": "badge required"}
    return next_step(request)

def catch_errors(request, next_step):
    try:
        return next_step(request)
    except Exception as error:
        return {"status": 500, "body": f"{type(error).__name__}: {error}"}

def core(request):
    if request["machine"] not in {"lathe", "mill"}:
        raise KeyError(request["machine"])
    return {"status": 200, "body": f"{request['machine']} status: running"}

def build(core_handler, *layers):
    handler = core_handler
    for layer in reversed(layers):
        handler = (lambda layer, inner: lambda request: layer(request, inner))(layer, handler)
    return handler

app = build(core, timing, catch_errors, require_badge)
for request in [{"machine": "lathe", "badge": "B-17"}, {"machine": "lathe"}, {"machine": "press", "badge": "B-17"}]:
    response = app(request)
    print(response["status"], response["body"], "| timed:", "ms" in response)
```

`build` wraps the layers from the inside out, so the first layer listed is the outermost: it sees each request first and each response last. The odd-looking double lambda gives each wrapper its own `layer` and `inner`. A plain lambda in a loop would see only the loop's final values, so the outermost wrapper would call itself until `RecursionError`.

The request without a badge is stopped by `require_badge` and never reaches `core`, yet it is still timed, because `timing` is outermost and wraps everything. The unknown machine raises `KeyError` inside `core`, which `catch_errors` turns into a 500 response, so the program carries on. Move `catch_errors` outside `timing` and the KeyError would escape `timing` before being caught, so the 500 response would carry no timing. With middleware, the order of the layers is part of the design.

::: challenge An approval chain [easy]
Write `make_chain(levels)`, where `levels` is a list of `(limit, approver)` pairs in increasing order of limit. It returns a function `approve(amount)` that returns the first approver whose limit is at least `amount`, and raises `LookupError` if the amount is above every limit. Also write `with_override(chain, rule)`, returning a new approval function that first asks `rule(amount)` (a function returning an approver name or `None`) and falls back to `chain(amount)` when the rule returns `None`.

```python starter
def make_chain(levels):
    def approve(amount):
        return None
    return approve

print(make_chain([(500, "team leader"), (5000, "manager")])(300))
```

```python solution
def make_chain(levels):
    def approve(amount):
        for limit, approver in levels:
            if amount <= limit:
                return approver
        raise LookupError(f"no one can approve {amount}")
    return approve

def with_override(chain, rule):
    def approve(amount):
        answer = rule(amount)
        return answer if answer is not None else chain(amount)
    return approve

chain = make_chain([(500, "team leader"), (5000, "manager"), (50000, "director")])
print(chain(300), chain(500), chain(501), chain(20000))
```

```python test
for _n in ["make_chain", "with_override"]:
    assert _n in dir(), f"Define {_n}."
_c = make_chain([(500, "team leader"), (5000, "manager"), (50000, "director")])
assert [_c(_a) for _a in [1, 500, 501, 5000, 5001, 50000]] == ["team leader", "team leader", "manager", "manager", "director", "director"], "The first level whose limit covers the amount, limits inclusive."
try:
    _c(50001)
    assert False, "Above every limit should raise LookupError."
except LookupError:
    pass
assert make_chain([])  is not None, "make_chain returns a function even for no levels."
try:
    make_chain([])(1)
    assert False, "An empty chain can approve nothing."
except LookupError:
    pass
_override = with_override(_c, lambda a: "auditor" if a % 1000 == 0 else None)
assert _override(3000) == "auditor" and _override(3001) == "manager" and _override(100) == "team leader", "The rule answers first; otherwise the chain does."
_never = with_override(_c, lambda a: None)
assert _never(600) == "manager", "A rule that always passes leaves the chain in charge."
_levels = [(100, "a")]
_c2 = make_chain(_levels)
assert _c2(50) == "a", "The chain works on the levels it was given."
"SUCCESS: Approval levels are data, overrides wrap the chain, and nobody edits a giant if/elif to add a level."
```

Hint: `make_chain` returns an inner function that loops over `levels` and returns the first approver with `amount <= limit`, raising `LookupError` after the loop. `with_override` returns a function that calls `rule` first and uses `chain` only if the rule returned `None`.
:::

::: challenge Routing support tickets [medium]
Write a base class `TicketHandler` with `then(handler)` (link a successor and return it, for chaining) and `handle(ticket)`, which by default passes the ticket on to the next handler or, if there is none, returns `"unassigned"`. Then write three handlers. Each overrides `handle`, deals with the tickets it can, and otherwise calls the base `handle` to pass the ticket on:

- `PasswordDesk`: handles tickets whose `"topic"` is `"password"`, returning `"self-service reset"`;
- `Specialist(skill, name)`: handles tickets whose `"topic"` equals `skill`, returning `name`, but only while it has handled fewer than `capacity` tickets (a third constructor argument, default 2); once full, it passes tickets on;
- `Escalation`: handles any ticket with `"priority"` of `"high"`, returning `"on-call engineer"`.

```python starter
class TicketHandler:
    def handle(self, ticket):
        return "unassigned"

print(TicketHandler().handle({"topic": "printer"}))
```

```python solution
class TicketHandler:
    def __init__(self):
        self._next = None

    def then(self, handler):
        self._next = handler
        return handler

    def handle(self, ticket):
        if self._next is None:
            return "unassigned"
        return self._next.handle(ticket)

class PasswordDesk(TicketHandler):
    def handle(self, ticket):
        if ticket.get("topic") == "password":
            return "self-service reset"
        return super().handle(ticket)

class Specialist(TicketHandler):
    def __init__(self, skill, name, capacity=2):
        super().__init__()
        self.skill, self.name, self.capacity = skill, name, capacity
        self.load = 0

    def handle(self, ticket):
        if ticket.get("topic") == self.skill and self.load < self.capacity:
            self.load += 1
            return self.name
        return super().handle(ticket)

class Escalation(TicketHandler):
    def handle(self, ticket):
        if ticket.get("priority") == "high":
            return "on-call engineer"
        return super().handle(ticket)

desk = PasswordDesk()
desk.then(Specialist("cnc", "Priya")).then(Specialist("cnc", "Tom", capacity=1)).then(Escalation())
for t in [{"topic": "password"}, {"topic": "cnc"}, {"topic": "cnc"}, {"topic": "cnc"}, {"topic": "cnc", "priority": "high"}, {"topic": "cnc"}]:
    print(desk.handle(t))
```

```python test
for _n in ["TicketHandler", "PasswordDesk", "Specialist", "Escalation"]:
    assert _n in dir(), f"Define {_n}."
_desk = PasswordDesk()
_end = _desk.then(Specialist("cnc", "Priya")).then(Specialist("cnc", "Tom", capacity=1)).then(Escalation())
assert isinstance(_end, Escalation), "then returns the handler it was given, so links can be chained."
_tickets = [{"topic": "password"}, {"topic": "cnc"}, {"topic": "cnc"}, {"topic": "cnc"}, {"topic": "cnc", "priority": "high"}, {"topic": "cnc"}, {"topic": "printer"}]
_got = [_desk.handle(_t) for _t in _tickets]
assert _got == ["self-service reset", "Priya", "Priya", "Tom", "on-call engineer", "unassigned", "unassigned"], f"Got {_got}."
assert TicketHandler().handle({"topic": "x"}) == "unassigned", "A lone base handler leaves tickets unassigned."
_s = Specialist("plc", "Ana", capacity=0)
assert _s.handle({"topic": "plc"}) == "unassigned", "A specialist with no capacity passes everything on."
_custom = TicketHandler()
class _Everything(TicketHandler):
    def handle(self, ticket):
        return "catch-all"
_custom.then(PasswordDesk()).then(_Everything())
assert _custom.handle({"topic": "anything"}) == "catch-all", "Any handler subclass can join the chain."
"SUCCESS: Each handler knows only its own rule and its successor, so the routing can be rearranged, extended or given a catch-all without editing any handler."
```

Hint: The base class stores `_next` (None at first); `then` sets it and returns the argument; `handle` forwards to `_next` or returns `"unassigned"`. Each subclass checks its own condition and otherwise returns `super().handle(ticket)`. `Specialist` counts how many tickets it has taken.
:::

::: challenge A middleware pipeline [hard]
Write `build(core, *layers)`: each layer is a function `layer(request, next_step)` and `core` is `core(request)`. It returns one function `handler(request)` that passes the request through the layers in the order given (the first layer outermost) and finally to `core`. Then write four layers:

- `log_to(lines)`: a factory returning a layer that appends `f"-> {request['path']}"` before passing the request on and `f"<- {response['status']}"` after;
- `require_role(role)`: a factory returning a layer that returns `{"status": 403}` without calling `next_step` unless `role in request.get("roles", ())`;
- `cache(store)`: a factory returning a layer that answers repeated requests for the same `request["path"]` from the dict `store`, calling `next_step` only on the first request for each path, and caching only responses with status 200;
- `errors_to_500`: a layer (not a factory) that returns `{"status": 500, "error": type(e).__name__}` if `next_step` raises.

```python starter
def build(core, *layers):
    return core

print(build(lambda r: {"status": 200})({"path": "/"}))
```

```python solution
def build(core, *layers):
    handler = core
    for layer in reversed(layers):
        def wrapped(request, layer=layer, inner=handler):
            return layer(request, inner)
        handler = wrapped
    return handler

def log_to(lines):
    def layer(request, next_step):
        lines.append(f"-> {request['path']}")
        response = next_step(request)
        lines.append(f"<- {response['status']}")
        return response
    return layer

def require_role(role):
    def layer(request, next_step):
        if role not in request.get("roles", ()):
            return {"status": 403}
        return next_step(request)
    return layer

def cache(store):
    def layer(request, next_step):
        path = request["path"]
        if path in store:
            return store[path]
        response = next_step(request)
        if response.get("status") == 200:
            store[path] = response
        return response
    return layer

def errors_to_500(request, next_step):
    try:
        return next_step(request)
    except Exception as e:
        return {"status": 500, "error": type(e).__name__}

lines = []
app = build(lambda r: {"status": 200, "body": r["path"]}, log_to(lines), require_role("operator"))
print(app({"path": "/spindle", "roles": ["operator"]}), app({"path": "/spindle"}), lines)
```

```python test
for _n in ["build", "log_to", "require_role", "cache", "errors_to_500"]:
    assert _n in dir(), f"Define {_n}."
_calls = []
def _core(_r):
    _calls.append(_r["path"])
    if _r["path"] == "/boom":
        raise ValueError("bad")
    return {"status": 200, "body": f"data for {_r['path']}"}
_lines, _store = [], {}
_app = build(_core, log_to(_lines), errors_to_500, require_role("operator"), cache(_store))
_op = {"roles": ["operator"]}
assert _app(dict(_op, path="/a")) == {"status": 200, "body": "data for /a"} and _app(dict(_op, path="/a"))["body"] == "data for /a", "Requests reach the core through all the layers."
assert _calls == ["/a"], f"The second /a should come from the cache; the core was called for {_calls}."
assert _app({"path": "/a"}) == {"status": 403}, "No role: refused before the cache, even for a cached path."
assert _app(dict(_op, path="/boom")) == {"status": 500, "error": "ValueError"}, "Errors from the core become 500 responses."
assert "/boom" not in _store and _calls.count("/boom") == 1, "Errors are not cached."
_app(dict(_op, path="/boom"))
assert _calls.count("/boom") == 2, "A failed request is tried again next time."
assert _lines == ["-> /a", "<- 200", "-> /a", "<- 200", "-> /a", "<- 403", "-> /boom", "<- 500", "-> /boom", "<- 500"], f"The outermost log sees every request and response; got {_lines}."
_order = []
def _mk(_tag):
    def _layer(_r, _nxt):
        _order.append(f"in {_tag}")
        _resp = _nxt(_r)
        _order.append(f"out {_tag}")
        return _resp
    return _layer
build(lambda _r: _order.append("core") or {"status": 200}, _mk("A"), _mk("B"), _mk("C"))({"path": "/"})
assert _order == ["in A", "in B", "in C", "core", "out C", "out B", "out A"], f"The first layer is outermost; got {_order}."
assert build(lambda _r: {"status": 204})({"path": "/"}) == {"status": 204}, "With no layers, build returns the core itself."
"SUCCESS: Each layer handles one concern before and after passing the request on, and the order you build them in decides who sees what."
```

Hint: In `build`, start with `handler = core` and wrap from the last layer to the first: each wrapper calls `layer(request, inner)`. Default arguments (`layer=layer, inner=handler`) freeze the current values for each wrapper, avoiding the late-binding trap of closures in a loop. Each factory returns an inner `layer(request, next_step)` function.
:::

## What you learned

- Chain of responsibility passes a request along an ordered sequence of handlers until one takes it, so the sender need not know who handles what.
- In Python the simplest chain is a list of functions returning a result or `None`. Linked handler objects suit handlers with state, and handlers that both act and pass on.
- The order of the chain is the policy: the first handler able to answer wins. Decide deliberately whether unhandled requests raise an error or reach a catch-all.
- Middleware gives each link the rest of the chain as a function, so it can act before and after, change requests and responses, or short-circuit. The first layer is outermost, and order matters.

The next lesson adds new operations to a fixed structure of classes without editing them: the visitor pattern.
