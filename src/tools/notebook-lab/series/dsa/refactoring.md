# Refactoring

The design lessons so far showed what good structure looks like. Real code rarely starts there: it grows under deadlines, one fix at a time, until a function is 80 lines of nested `if`s that everyone is afraid to touch. **Refactoring** is improving the structure of existing code **without changing what it does**. The second half of that sentence is the whole discipline. A refactoring that changes behaviour is not a refactoring; it is a bug, or a feature nobody asked for.

The method that makes refactoring safe is simple. First, pin down the current behaviour with tests. Then change the structure in **small steps**, each one so small that if the tests fail, the cause is obvious, and run the tests after every step. Many small, checked steps are faster than one big rewrite, because a big rewrite fails in ways that take days to track down.

This lesson covers:

- characterisation tests: recording what code currently does, before changing it;
- **code smells**, the signs that structure is getting in the way;
- a worked refactoring in small steps: guard clauses, named constants, extracted functions;
- grouping a long parameter list into an object, and when not to refactor.

## Pin the behaviour down first

Here is a shipping-cost function from an online parts shop, after years of small changes. Nobody is sure exactly what it does in every case, which is precisely the problem.

```python type
def ship(w, d, c, m, e):
    if w > 0:
        if d == "UK":
            if w <= 2:
                p = 3.5
            else:
                if w <= 10:
                    p = 3.5 + (w - 2) * 0.8
                else:
                    p = 3.5 + 8 * 0.8 + (w - 10) * 0.5
        else:
            if d == "EU":
                p = 9 + w * 1.6
            else:
                p = 15 + w * 2.9
        if c >= 150 and d == "UK":
            p = 0
        else:
            if m:
                p = p * 0.9
        if e:
            p = p + 6
        return round(p, 2)
    else:
        raise ValueError("bad weight")

print(ship(5, "UK", 40, False, False), ship(5, "UK", 200, True, True), ship(5, "EU", 40, True, False))
```

```output
5.9 6 15.3
```

Before changing a line, record what it does. A **characterisation test** (sometimes called a golden master) does not ask what the code **should** do. It records what it **does**, for many inputs, so any change in behaviour shows up at once. Run the function on a grid covering every branch, including errors, and keep the results.

```python type
import itertools

def snapshot(function, inputs):
    results = {}
    for args in inputs:
        try:
            results[args] = function(*args)
        except Exception as error:
            results[args] = ("raises", type(error).__name__)
    return results

inputs = list(itertools.product([-1, 0, 0.5, 2, 3, 10, 11, 30], ["UK", "EU", "US"], [0, 149, 150, 300], [False, True], [False, True]))
baseline = snapshot(ship, inputs)
print(len(inputs), "input combinations recorded")
print("example:", (11, "UK", 0, True, True), "->", baseline[(11, "UK", 0, True, True)])
print("errors recorded:", sum(1 for r in baseline.values() if isinstance(r, tuple)))
```

```output
384 input combinations recorded
example: (11, 'UK', 0, True, True) -> 15.36
errors recorded: 96
```

The grid is chosen from the code itself: weights either side of every threshold in it (0, 2, 10), every destination, order values either side of 150, and both settings of each flag. 384 combinations cover every path through the function.

The weights −1 and 0 raise `ValueError`, and the snapshot records that too: an error is behaviour, and refactoring must keep it. From here on, every step ends with `snapshot(new_version, inputs) == baseline`.

## Code smells

A **code smell** is a surface sign that the structure may be hurting. It is not proof of a bug; it is a reason to look. `ship` has several of the commonest:

- **Cryptic names**: `w`, `d`, `c`, `m`, `e`, `p`. The reader must decode them from how they are used.
- **Deep nesting**: four levels of `if`/`else`; the error case is at the very bottom, far from its check.
- **Magic numbers**: 3.5, 0.8, 150, 0.9, 6. What is 150? Free-shipping threshold? Where else does it appear?
- **A long function doing several jobs**: a base rate by destination, the UK weight bands, the free-shipping rule, the member discount and the express surcharge.
- **Duplicated knowledge**: `3.5 + 8 * 0.8` silently repeats the band rate and band width.

Other common smells include long parameter lists, the same `if` switch repeated in several functions (the polymorphism lesson), a class that uses another class's data more than its own ("feature envy"), and comments that explain **what** confusing code does instead of the code saying it plainly.

## Refactoring in small steps

**Step 1: rename, and use guard clauses.** A **guard clause** handles a special case at the top and leaves the function at once, so the main logic is not wrapped in an `if`. The error check moves to the top, and the code below it loses a level of nesting. Names become words. Then the `else: if` chains flatten into `elif`.

**Step 2: name the magic numbers.** Each number becomes a named constant. The name says what it means, and it is written once.

**Step 3: extract functions.** The base rate by destination becomes `base_rate(weight_kg, destination)`. The UK bands get their own function too. `ship` now reads like a summary of the pricing rules. After each step, the snapshot must still match. Predict before running: does every step keep all 384 results identical?

```python type
def ship_step1(weight_kg, destination, order_value, member, express):
    if weight_kg <= 0:
        raise ValueError("bad weight")
    if destination == "UK":
        if weight_kg <= 2:
            price = 3.5
        elif weight_kg <= 10:
            price = 3.5 + (weight_kg - 2) * 0.8
        else:
            price = 3.5 + 8 * 0.8 + (weight_kg - 10) * 0.5
    elif destination == "EU":
        price = 9 + weight_kg * 1.6
    else:
        price = 15 + weight_kg * 2.9
    if order_value >= 150 and destination == "UK":
        price = 0
    elif member:
        price = price * 0.9
    if express:
        price = price + 6
    return round(price, 2)

print("step 1 matches:", snapshot(ship_step1, inputs) == baseline)

UK_FIRST_BAND_KG, UK_SECOND_BAND_KG = 2, 10
UK_BASE, UK_SECOND_BAND_PER_KG, UK_HEAVY_PER_KG = 3.5, 0.8, 0.5
EU_BASE, EU_PER_KG = 9, 1.6
WORLD_BASE, WORLD_PER_KG = 15, 2.9
FREE_UK_SHIPPING_FROM = 150
MEMBER_PRICE_FACTOR = 0.9
EXPRESS_SURCHARGE = 6

def uk_rate(weight_kg):
    if weight_kg <= UK_FIRST_BAND_KG:
        return UK_BASE
    second_band_kg = min(weight_kg, UK_SECOND_BAND_KG) - UK_FIRST_BAND_KG
    heavy_kg = max(weight_kg - UK_SECOND_BAND_KG, 0)
    return UK_BASE + second_band_kg * UK_SECOND_BAND_PER_KG + heavy_kg * UK_HEAVY_PER_KG

def base_rate(weight_kg, destination):
    if destination == "UK":
        return uk_rate(weight_kg)
    if destination == "EU":
        return EU_BASE + weight_kg * EU_PER_KG
    return WORLD_BASE + weight_kg * WORLD_PER_KG

def ship_step3(weight_kg, destination, order_value, member, express):
    if weight_kg <= 0:
        raise ValueError("bad weight")
    price = base_rate(weight_kg, destination)
    if destination == "UK" and order_value >= FREE_UK_SHIPPING_FROM:
        price = 0
    elif member:
        price *= MEMBER_PRICE_FACTOR
    if express:
        price += EXPRESS_SURCHARGE
    return round(price, 2)

print("step 3 matches:", snapshot(ship_step3, inputs) == baseline)
```

```output
step 1 matches: True
step 3 matches: True
```

Step 2 was done together with step 3 here to save space; in practice it is a step of its own, checked like the others.

All 384 results are identical after every step. Yet the final version reads differently. The UK bands are one small function whose numbers have names. The free-shipping rule says exactly what it is. A change such as "free UK shipping from £120" is a one-word edit to one constant.

Notice one thing that did **not** happen: the confusing behaviour was kept. Express is charged even on "free" shipping, and the member discount never applies to the express surcharge. Those might be bugs. But refactoring is not the moment to decide. Note them, finish the refactoring, then change behaviour as a separate, deliberate step with its own tests. Mixing the two makes it impossible to tell which change broke what.

## Long parameter lists and parameter objects

`ship_step3(5, "UK", 40, False, True)` is still hard to read at the call site: which `False` is which? Five parameters that always travel together suggest a missing concept: a **shipment**. Grouping them into an object is called **introduce parameter object**, and a dataclass makes it cheap.

```python type
from dataclasses import dataclass

@dataclass(frozen=True)
class Shipment:
    weight_kg: float
    destination: str
    order_value: float
    member: bool = False
    express: bool = False

def shipping_cost(s):
    return ship_step3(s.weight_kg, s.destination, s.order_value, s.member, s.express)

print(shipping_cost(Shipment(5, "UK", 40, express=True)))
print("still matches:", all(shipping_cost(Shipment(*args)) == baseline[args] for args in inputs if not isinstance(baseline[args], tuple)))
```

```output
11.9
still matches: True
```

`frozen=True` makes the dataclass immutable, so a shipment cannot be changed by the code that prices it.

`Shipment(5, "UK", 40, express=True)` says what it means at the call site, and the defaults mean the common case needs fewer arguments. The concept also gives later code somewhere to live: a `shipment.is_domestic()` method, for instance, instead of `destination == "UK"` repeated in several places.

## When not to refactor

Refactoring costs time, so it should pay for itself. Good moments are just **before** changing code (make the change easy, then make the easy change) and just after getting something working. Leave alone code that works, is rarely read and will not change: tidiness alone is not a reason. And refactor only what tests protect. Without a safety net, a "refactoring" is a gamble. When a function has no tests at all, writing characterisation tests is the first step, as here.

::: challenge Flatten with guard clauses [easy]
`can_start(machine)` below decides whether a machine may start, through five levels of nesting. Rewrite it with **guard clauses**, so that each failed check returns its message straight away and no line of the function is indented more than 8 spaces. It must return exactly what the original returns for every possible input. `machine` is a dict with boolean values for `"powered"`, `"guard_closed"`, `"emergency_stop"` and `"trained_operator"`, and a number for `"temperature"`.

```python starter
def can_start(machine):
    if machine["powered"]:
        if machine["guard_closed"]:
            if not machine["emergency_stop"]:
                if machine["temperature"] < 80:
                    if machine["trained_operator"]:
                        return "OK"
                    else:
                        return "no trained operator"
                else:
                    return "too hot"
            else:
                return "emergency stop engaged"
        else:
            return "guard open"
    else:
        return "no power"

print(can_start({"powered": True, "guard_closed": True, "emergency_stop": False, "temperature": 40, "trained_operator": True}))
```

```python solution
def can_start(machine):
    if not machine["powered"]:
        return "no power"
    if not machine["guard_closed"]:
        return "guard open"
    if machine["emergency_stop"]:
        return "emergency stop engaged"
    if machine["temperature"] >= 80:
        return "too hot"
    if not machine["trained_operator"]:
        return "no trained operator"
    return "OK"

print(can_start({"powered": True, "guard_closed": True, "emergency_stop": False, "temperature": 40, "trained_operator": True}))
```

```python test
import itertools as _it
assert "can_start" in dir(), "Keep the function's name as can_start."
def _original(m):
    if m["powered"]:
        if m["guard_closed"]:
            if not m["emergency_stop"]:
                if m["temperature"] < 80:
                    if m["trained_operator"]:
                        return "OK"
                    else:
                        return "no trained operator"
                else:
                    return "too hot"
            else:
                return "emergency stop engaged"
        else:
            return "guard open"
    else:
        return "no power"
for _p, _g, _e, _t, _o in _it.product([True, False], [True, False], [True, False], [20, 79, 79.9, 80, 120], [True, False]):
    _m = {"powered": _p, "guard_closed": _g, "emergency_stop": _e, "temperature": _t, "trained_operator": _o}
    assert can_start(_m) == _original(_m), f"For {_m}: the original returns {_original(_m)!r}, yours {can_start(_m)!r}."
_body = _source.split("def can_start")[1].split("\nprint(")[0].split("\ndef ")[0]
_deep = [_l for _l in _body.split("\n") if _l.strip() and len(_l) - len(_l.lstrip()) > 8]
assert not _deep, f"Some lines are still nested more than two levels deep: {_deep[0].strip()!r}. Return early from each failed check."
"SUCCESS: Same answers for all 80 combinations, with each rule now one flat line: the checks read in order, top to bottom."
```

Hint: Turn each condition around and return its failure message at once: `if not machine["powered"]: return "no power"`, and so on, in the same order as the original checks. Whatever survives every check returns `"OK"`.
:::

::: challenge A characterisation harness [medium]
Write the safety net as reusable tools. `record(function, inputs)` takes a function and a list of argument tuples, and returns a dict mapping each tuple to what `function(*args)` returned or, if it raised, to the tuple `("raises", "ExceptionName")`. `differences(function, recording)` re-runs `function` on every input in a recording made by `record` and returns a list of `(args, expected, actual)` for every input whose result changed (raising a different exception, or raising instead of returning, counts as a change), in the order the inputs were recorded.

```python starter
def record(function, inputs):
    return {}

def differences(function, recording):
    return []

print(record(lambda a, b: a / b, [(1, 2), (1, 0)]))
```

```python solution
def _run(function, args):
    try:
        return function(*args)
    except Exception as error:
        return ("raises", type(error).__name__)

def record(function, inputs):
    return {args: _run(function, args) for args in inputs}

def differences(function, recording):
    changed = []
    for args, expected in recording.items():
        actual = _run(function, args)
        if actual != expected:
            changed.append((args, expected, actual))
    return changed

print(record(lambda a, b: a / b, [(1, 2), (1, 0)]))
```

```python test
assert "record" in dir() and "differences" in dir(), "Define record and differences."
_rec = record(lambda a, b: a / b, [(1, 2), (1, 0), (6, 3)])
assert _rec == {(1, 2): 0.5, (1, 0): ("raises", "ZeroDivisionError"), (6, 3): 2.0}, f"record gave {_rec!r}."
assert differences(lambda a, b: a / b, _rec) == [], "The same function shows no differences."
def _int_div(a, b):
    return a // b
assert differences(_int_div, _rec) == [((1, 2), 0.5, 0)], f"Integer division changes only (1, 2); got {differences(_int_div, _rec)}."
def _safe(a, b):
    return a / b if b else 0
assert differences(_safe, _rec) == [((1, 0), ("raises", "ZeroDivisionError"), 0)], "Returning instead of raising is a change."
def _other_error(a, b):
    if b == 0:
        raise ValueError("zero")
    return a / b
assert differences(_other_error, _rec) == [((1, 0), ("raises", "ZeroDivisionError"), ("raises", "ValueError"))], "Raising a different exception is a change."
_rec2 = record(lambda s: s.upper(), [("a",), ("b",), (None,)])
assert list(_rec2) == [("a",), ("b",), (None,)] and _rec2[(None,)] == ("raises", "AttributeError"), "Inputs keep their order; errors are recorded by exception name."
assert [_d[0] for _d in differences(lambda s: s, _rec2)] == [("a",), ("b",), (None,)], "Differences come in the order the inputs were recorded."
assert record(len, []) == {} and differences(len, {}) == [], "Empty input lists work."
"SUCCESS: With record before and differences after, any refactoring step can be checked in one line: an empty list means the behaviour is unchanged."
```

Hint: Write a small helper that calls `function(*args)` inside `try`, returning the result or `("raises", type(error).__name__)`. `record` builds a dict with it. `differences` loops over `recording.items()`, re-runs the helper, and collects the entries where the new result `!=` the recorded one.
:::

::: challenge Refactor the quote calculator [hard]
`q(n, u, t, mem, cp)` prices a workshop order: n units at unit price u, of product type t (`"part"` or `"tool"`), for a member or not, with an optional coupon code. It works, but it is full of smells. Refactor it, keeping its behaviour exactly, into:

- named constants `BULK_QUANTITY = 50`, `BULK_FACTOR = 0.95`, `TOOL_VAT = 0.2`, `MEMBER_FACTOR = 0.92` and `COUPON_OFF = {"SPRING10": 10, "TRADE25": 25}` (coupon amounts in pounds);
- `goods_price(quantity, unit_price)`: the price before VAT, with the bulk discount;
- `with_vat(amount, product_type)`: tools add VAT, parts don't;
- `quote(quantity, unit_price, product_type, member=False, coupon=None)`: the full price, using the functions above and the constants, giving exactly what `q` gives (including its errors), rounded to 2 places.

The test checks `quote` against the original on thousands of inputs, and checks each helper on its own.

```python starter
def q(n, u, t, mem, cp):
    if n > 0 and u >= 0:
        if n >= 50:
            x = n * u * 0.95
        else:
            x = n * u
        if t == "tool":
            x = x * 1.2
        elif t != "part":
            raise ValueError("type")
        if mem:
            x = x * 0.92
        if cp == "SPRING10":
            x = x - 10
        elif cp == "TRADE25":
            x = x - 25
        elif cp is not None:
            raise ValueError("coupon")
        if x < 0:
            x = 0
        return round(x, 2)
    raise ValueError("quantity or price")

print(q(60, 2.5, "tool", True, "SPRING10"))
```

```python solution
BULK_QUANTITY = 50
BULK_FACTOR = 0.95
TOOL_VAT = 0.2
MEMBER_FACTOR = 0.92
COUPON_OFF = {"SPRING10": 10, "TRADE25": 25}

def goods_price(quantity, unit_price):
    price = quantity * unit_price
    if quantity >= BULK_QUANTITY:
        price *= BULK_FACTOR
    return price

def with_vat(amount, product_type):
    if product_type == "tool":
        return amount * (1 + TOOL_VAT)
    if product_type == "part":
        return amount
    raise ValueError("type")

def quote(quantity, unit_price, product_type, member=False, coupon=None):
    if quantity <= 0 or unit_price < 0:
        raise ValueError("quantity or price")
    price = with_vat(goods_price(quantity, unit_price), product_type)
    if member:
        price *= MEMBER_FACTOR
    if coupon is not None:
        if coupon not in COUPON_OFF:
            raise ValueError("coupon")
        price -= COUPON_OFF[coupon]
    return round(max(price, 0), 2)

print(quote(60, 2.5, "tool", member=True, coupon="SPRING10"))
```

```python test
import itertools as _it
for _n in ["quote", "goods_price", "with_vat"]:
    assert _n in dir(), f"Define {_n}."
assert (BULK_QUANTITY, BULK_FACTOR, TOOL_VAT, MEMBER_FACTOR) == (50, 0.95, 0.2, 0.92) and COUPON_OFF == {"SPRING10": 10, "TRADE25": 25}, "Define the named constants with the original values."
def _q(n, u, t, mem, cp):
    if n > 0 and u >= 0:
        if n >= 50:
            x = n * u * 0.95
        else:
            x = n * u
        if t == "tool":
            x = x * 1.2
        elif t != "part":
            raise ValueError("type")
        if mem:
            x = x * 0.92
        if cp == "SPRING10":
            x = x - 10
        elif cp == "TRADE25":
            x = x - 25
        elif cp is not None:
            raise ValueError("coupon")
        if x < 0:
            x = 0
        return round(x, 2)
    raise ValueError("quantity or price")
def _outcome(_f, *_a):
    try:
        return _f(*_a)
    except Exception as _e:
        return ("raises", type(_e).__name__)
_count = 0
for _n, _u, _t, _m, _c in _it.product([-1, 0, 1, 49, 50, 51, 200], [-0.5, 0, 0.1, 2.5, 19.99], ["part", "tool", "gadget"], [False, True], [None, "SPRING10", "TRADE25", "BOGUS"]):
    _want = _outcome(_q, _n, _u, _t, _m, _c)
    _got = _outcome(quote, _n, _u, _t, _m, _c)
    assert _got == _want, f"quote{(_n, _u, _t, _m, _c)} gave {_got!r}; the original gives {_want!r}."
    _count += 1
assert goods_price(10, 3) == 30 and goods_price(50, 2) == 95.0, "goods_price applies the bulk factor from 50 units."
assert with_vat(100, "tool") == 120 and with_vat(100, "part") == 100, "with_vat adds 20% for tools only."
assert _outcome(with_vat, 5, "gadget") == ("raises", "ValueError"), "with_vat rejects unknown product types, as the original does."
assert quote(60, 2.5, "tool", member=True, coupon="SPRING10") == 147.32, "The example from the starter."
_calls = []
_real_goods, _real_vat = goods_price, with_vat
goods_price = lambda q, u: (_calls.append("goods"), _real_goods(q, u))[1]
with_vat = lambda a, t: (_calls.append("vat"), _real_vat(a, t))[1]
try:
    quote(60, 2.5, "tool")
finally:
    goods_price, with_vat = _real_goods, _real_vat
assert "goods" in _calls and "vat" in _calls, "quote should use goods_price and with_vat, so each rule lives in one place."
_real_member = MEMBER_FACTOR
MEMBER_FACTOR = 0.5
try:
    _changed = quote(10, 10, "part", member=True)
finally:
    MEMBER_FACTOR = _real_member
assert _changed == 50.0, "quote should read MEMBER_FACTOR rather than repeat 0.92, so changing the constant changes the price."
"SUCCESS: Same result as the original for all 840 combinations, including every error, and now each rule has a name and a single home."
```

Hint: Copy the checks in the same order: the quantity/price error first, as a guard clause; then goods price; then VAT (which also rejects unknown types); then the member factor; then the coupon (unknown codes raise); and finally `max(price, 0)` before rounding. Run your version against `q` on a few inputs as you go.
:::

## What you learned

- Refactoring changes structure without changing behaviour, in small steps, with tests run after each one.
- Before refactoring untested code, record what it does with characterisation tests on inputs chosen from its branches and thresholds, errors included.
- Code smells, such as cryptic names, deep nesting, magic numbers, long functions, duplicated knowledge and long parameter lists, point to where structure hurts.
- Guard clauses flatten nesting, named constants give numbers meaning and a single home, extracted functions name each rule, and a parameter object turns values that travel together into a concept.
- Keep suspicious behaviour while refactoring, and fix it afterwards as a separate, deliberate change.

The next part of the series turns these principles into named, reusable designs: the design patterns, starting with Strategy.
