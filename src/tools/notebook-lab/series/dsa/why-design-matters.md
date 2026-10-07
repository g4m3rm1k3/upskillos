# Why design matters

So far, every lesson in this series has asked one question of code: is it correct, and how fast is it? This part of the series asks a third: how hard is it to **change**? Real programs are changed for as long as they are used. Prices change, reports gain a new format, a rule gets an exception, a bug needs a test that pins it down. Two programs can produce identical output today and differ enormously in what tomorrow's change costs. **Design** is the set of decisions that sets that cost: how code is split into pieces, and what each piece knows about the others.

Two words name the main ideas. **Cohesion** is how closely the contents of one piece belong together: a function that does one job is highly cohesive. **Coupling** is how much one piece depends on the details of another: two pieces that share a global variable, or that rely on each other's internal layout, are tightly coupled. Good design aims for high cohesion and low coupling, because then a change usually lands in one place.

This lesson covers:

- a working program that resists change, and the specific ways it resists;
- splitting it into cohesive functions, and what that does to testing and to new features;
- coupling through shared global state, and removing it;
- keeping calculations separate from input and output, so the important logic is easy to test.

## A program that works and resists change

A tool-hire shop prints invoices from a CSV export of orders. Hiring a tool for 7 days or more earns a 15% weekly discount, and VAT at 20% is added at the end. Here is the program as it might first be written: one function, top to bottom.

```python type
orders_csv = """tool,days,daily_rate
drill,2,12.50
cement mixer,7,30.00
ladder,1,8.00
"""

def print_invoice(csv_text):
    total = 0
    lines = []
    for row in csv_text.strip().splitlines()[1:]:
        tool, days, rate = row.split(",")
        cost = int(days) * float(rate)
        if int(days) >= 7:
            cost = cost * 0.85
        total += cost
        lines.append(f"{tool:<14}{int(days):>3} days  £{cost:8.2f}")
    vat = total * 0.2
    print("TOOL HIRE INVOICE")
    for line in lines:
        print(line)
    print(f"{'subtotal':<23}£{total:8.2f}")
    print(f"{'VAT 20%':<23}£{vat:8.2f}")
    print(f"{'total':<23}£{total + vat:8.2f}")

print_invoice(orders_csv)
```

```output
TOOL HIRE INVOICE
drill           2 days  £   25.00
cement mixer    7 days  £  178.50
ladder          1 days  £    8.00
subtotal               £  211.50
VAT 20%                £   42.30
total                  £  253.80
```

It works. Now consider three ordinary requests from the shop:

1. "Check that the weekly discount is right for a 6, 7 and 8 day hire."
2. "Customers want the invoice by email, as HTML."
3. "Some customers are VAT-exempt."

Predict before reading on: which lines of `print_invoice` would each request touch?

## Counting what a change costs

Request 1 asks to **test** one rule: the discount. But the rule has no name and no inputs of its own. It is two lines in the middle of a loop that also parses CSV text, formats lines and prints. To check it, a test must build CSV text, run the whole function, capture what it prints, and pick a number back out of the text. Here is that test, for one hire.

```python type
import io, contextlib

def discount_cost_via_invoice(days, rate):
    csv_text = f"tool,days,daily_rate\nthing,{days},{rate}\n"
    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        print_invoice(csv_text)
    line = captured.getvalue().splitlines()[1]
    return float(line.split("£")[1])

for days in [6, 7, 8]:
    print(days, "days at £10:", discount_cost_via_invoice(days, 10))
```

```output
6 days at £10: 60.0
7 days at £10: 59.5
8 days at £10: 68.0
```

`contextlib.redirect_stdout` sends everything printed inside the `with` block into a `StringIO` object, a string that behaves like a file. That is how a test can read what a function printed.

The answers are right (60.0, 59.5, 68.0), but the test depends on the CSV header, the column order, the line layout, which line the item is on, and the `£` sign. Change any of those, for reasons unrelated to discounts, and this test breaks.

Request 2, HTML, is worse. Calculation and printing are interleaved, so the only way to get HTML is a second copy of the whole function with the `print` lines replaced. Then every future pricing change must be made twice, and sooner or later one copy will be missed. Request 3 means threading a new condition through the middle of the function again. One function does four jobs: parsing, pricing, totalling and printing. Its cohesion is low, so every change touches it, and every change risks the other three jobs.

## Splitting by job

Give each job its own function, with inputs and outputs instead of prints:

- `parse_orders(csv_text)` turns text into a list of `(tool, days, rate)` tuples;
- `hire_cost(days, rate)` applies the pricing rule;
- `invoice_totals(orders, vat_rate)` adds everything up and returns the numbers;
- `format_invoice(totals)` turns the numbers into text.

`print_invoice` survives, as one line chaining them together. Each function now has one reason to change: the CSV layout, the pricing rule, the tax rules, or the look of the output. Predict before running: how long is the test of the discount now?

```python type
def parse_orders(csv_text):
    orders = []
    for row in csv_text.strip().splitlines()[1:]:
        tool, days, rate = row.split(",")
        orders.append((tool, int(days), float(rate)))
    return orders

def hire_cost(days, rate):
    cost = days * rate
    return cost * 0.85 if days >= 7 else cost

def invoice_totals(orders, vat_rate=0.2):
    lines = [(tool, days, hire_cost(days, rate)) for tool, days, rate in orders]
    subtotal = sum(cost for _, _, cost in lines)
    vat = subtotal * vat_rate
    return {"lines": lines, "subtotal": subtotal, "vat_rate": vat_rate, "vat": vat, "total": subtotal + vat}

def format_invoice(totals):
    out = ["TOOL HIRE INVOICE"]
    out += [f"{tool:<14}{days:>3} days  £{cost:8.2f}" for tool, days, cost in totals["lines"]]
    out.append(f"{'subtotal':<23}£{totals['subtotal']:8.2f}")
    out.append(f"{'VAT ' + format(totals['vat_rate'], '.0%'):<23}£{totals['vat']:8.2f}")
    out.append(f"{'total':<23}£{totals['total']:8.2f}")
    return "\n".join(out)

def print_invoice(csv_text):
    print(format_invoice(invoice_totals(parse_orders(csv_text))))

assert [hire_cost(d, 10) for d in [6, 7, 8]] == [60, 59.5, 68]
print_invoice(orders_csv)
```

```output
TOOL HIRE INVOICE
drill           2 days  £   25.00
cement mixer    7 days  £  178.50
ladder          1 days  £    8.00
subtotal               £  211.50
VAT 20%                £   42.30
total                  £  253.80
```

`format(0.2, '.0%')` writes a fraction as a whole percentage, `20%`.

The output is identical, and the discount test is one line with no text in it. The other two requests now land in one place each:

```python type
def format_invoice_html(totals):
    rows = "".join(f"<tr><td>{tool}</td><td>{days}</td><td>£{cost:.2f}</td></tr>" for tool, days, cost in totals["lines"])
    return f"<table>{rows}<tr><td colspan=2>total</td><td>£{totals['total']:.2f}</td></tr></table>"

orders = parse_orders(orders_csv)
print(format_invoice_html(invoice_totals(orders)))
print()
print(format_invoice(invoice_totals(orders, vat_rate=0)))
```

```output
<table><tr><td>drill</td><td>2</td><td>£25.00</td></tr><tr><td>cement mixer</td><td>7</td><td>£178.50</td></tr><tr><td>ladder</td><td>1</td><td>£8.00</td></tr><tr><td colspan=2>total</td><td>£253.80</td></tr></table>

TOOL HIRE INVOICE
drill           2 days  £   25.00
cement mixer    7 days  £  178.50
ladder          1 days  £    8.00
subtotal               £  211.50
VAT 0%                 £    0.00
total                  £  211.50
```

HTML is a **new** function beside the old one. Nothing that already worked was edited, so nothing that already worked can break. VAT exemption is an argument. The pricing rule still exists exactly once, so a future change to it reaches both formats automatically. This is what high cohesion buys: a change maps onto the one piece responsible for it.

## Coupling through shared state

The second force is coupling: how much pieces depend on each other's details. The tightest, most surprising kind is **shared mutable state**, usually a global variable that several functions read and some functions change. Suppose the VAT rate lived in a global, and the code for exempt customers set it to 0 and put it back afterwards. Predict before running: what VAT does the third customer pay?

```python type
VAT_RATE = 0.2

def total_with_vat(subtotal):
    return round(subtotal * (1 + VAT_RATE), 2)

def bill_exempt_customer(subtotal):
    global VAT_RATE
    VAT_RATE = 0
    amount = total_with_vat(subtotal)
    if subtotal > 1000:
        return amount
    VAT_RATE = 0.2
    return amount

print("ordinary customer:", total_with_vat(100.0))
print("exempt customer, large order:", bill_exempt_customer(1500.0))
print("ordinary customer:", total_with_vat(100.0))
```

```output
ordinary customer: 120.0
exempt customer, large order: 1500.0
ordinary customer: 100.0
```

`global VAT_RATE` lets a function assign to a module-level variable. Without it, the assignment would create a new local variable.

The early `return` skipped the line that restores the rate, so the third, ordinary, customer pays no VAT. Nothing in `total_with_vat` changed. Its behaviour depends on what **any** other function did to the global earlier, possibly far away in the code. To understand or test it, you would have to know the whole history of the program. Passing the rate as an argument removes the coupling: `total_with_vat(subtotal, vat_rate)` depends only on what it is given, and no other function can change what it does behind its back. Constants that never change are fine as globals; it is shared **mutable** state that couples code.

## Logic inside, input and output at the edges

The split version has a shape worth naming. Its calculations (`hire_cost`, `invoice_totals`) take values and return values. They do not print, read files, look at the clock or change anything outside themselves. Such functions are called **pure**: the same inputs always give the same output. All the input and output happens in one thin function at the edge, `print_invoice`. This is sometimes called a **functional core with an imperative shell**.

The payoff is testing. A pure function is tested by calling it and comparing the result, with no setup or capturing, and it can be checked against thousands of generated inputs cheaply. The shell is kept so thin that it barely needs testing. The same thinking applies to anything a function would otherwise reach out for: the current date, random numbers, a database. Pass them in as arguments, and the function becomes predictable. Later lessons build this into a technique, dependency injection.

Coupling and cohesion are not rules to follow blindly: splitting a five-line script into five classes makes it harder to read, not easier. They are a way to predict costs. Before writing, ask two questions. What changes are likely? Where will each one land?

::: challenge Separate the sums from the printing [easy]
`report_temperatures(readings)` below works out the minimum, maximum and mean of a list of temperatures and prints them, so the calculation can only be checked by reading printed text. Split it. Write `temperature_summary(readings)`, which **returns** a dict with keys `"min"`, `"max"` and `"mean"` (the mean rounded to 1 decimal place) and prints nothing. Then rewrite `report_temperatures(readings)` to call it and print exactly the same lines as before.

```python starter
def report_temperatures(readings):
    low, high = min(readings), max(readings)
    mean = round(sum(readings) / len(readings), 1)
    print(f"min {low}")
    print(f"max {high}")
    print(f"mean {mean}")

report_temperatures([18.5, 21.0, 19.2, 23.4])
```

```python solution
def temperature_summary(readings):
    return {"min": min(readings), "max": max(readings), "mean": round(sum(readings) / len(readings), 1)}

def report_temperatures(readings):
    summary = temperature_summary(readings)
    print(f"min {summary['min']}")
    print(f"max {summary['max']}")
    print(f"mean {summary['mean']}")

report_temperatures([18.5, 21.0, 19.2, 23.4])
```

```python test
import io as _io, contextlib as _ctx, random as _random
assert "temperature_summary" in dir() and "report_temperatures" in dir(), "Define both temperature_summary and report_temperatures."
_buf = _io.StringIO()
with _ctx.redirect_stdout(_buf):
    _s = temperature_summary([18.5, 21.0, 19.2, 23.4])
assert _buf.getvalue() == "", f"temperature_summary should print nothing; it printed {_buf.getvalue()!r}."
assert _s == {"min": 18.5, "max": 23.4, "mean": 20.5}, f"Expected {{'min': 18.5, 'max': 23.4, 'mean': 20.5}}, got {_s!r}."
_rng = _random.Random(17)
for _ in range(50):
    _r = [round(_rng.uniform(-10, 35), 1) for _ in range(_rng.randint(1, 8))]
    _want = {"min": min(_r), "max": max(_r), "mean": round(sum(_r) / len(_r), 1)}
    assert temperature_summary(_r) == _want, f"For {_r}: expected {_want}, got {temperature_summary(_r)}."
_buf = _io.StringIO()
with _ctx.redirect_stdout(_buf):
    report_temperatures([3, -2, 7])
assert _buf.getvalue() == "min -2\nmax 7\nmean 2.7\n", f"report_temperatures should still print the same three lines; it printed {_buf.getvalue()!r}."
_real_summary = temperature_summary
temperature_summary = lambda readings: {"min": 1, "max": 2, "mean": 3}
try:
    _buf = _io.StringIO()
    with _ctx.redirect_stdout(_buf):
        report_temperatures([50, 60])
    assert _buf.getvalue() == "min 1\nmax 2\nmean 3\n", "report_temperatures should call temperature_summary and print its results, so the sums exist in one place."
finally:
    temperature_summary = _real_summary
"SUCCESS: The calculation is now a pure function, tested by comparing dicts, and the printing is a thin shell around it."
```

Hint: Move the three calculations into `temperature_summary` and `return` them in a dict. In `report_temperatures`, call it once and print each value from the dict with the same f-strings as before.
:::

::: challenge Remove the shared exchange rate [medium]
A parts supplier converts prices with a global exchange rate that a "special customer" function changes and fails to restore, the same bug as in the lesson. Rewrite both functions so that nothing reads or writes a global rate. `to_euros(pounds, rate)` takes the rate as an argument and returns `round(pounds * rate, 2)`. `quote_special(pounds, rate)` gives a 10% discount, applied to the converted price: return `round(to_euros(pounds, rate) * 0.9, 2)`. Delete the global `GBP_TO_EUR` from your code entirely.

```python starter
GBP_TO_EUR = 1.17

def to_euros(pounds):
    return round(pounds * GBP_TO_EUR, 2)

def quote_special(pounds):
    global GBP_TO_EUR
    GBP_TO_EUR = GBP_TO_EUR * 0.9
    return to_euros(pounds)

print(to_euros(100), quote_special(100), to_euros(100))
```

```python solution
def to_euros(pounds, rate):
    return round(pounds * rate, 2)

def quote_special(pounds, rate):
    return round(to_euros(pounds, rate) * 0.9, 2)

print(to_euros(100, 1.17), quote_special(100, 1.17), to_euros(100, 1.17))
```

```python test
import inspect as _inspect
assert "to_euros" in dir() and "quote_special" in dir(), "Keep the names to_euros and quote_special."
assert "GBP_TO_EUR" not in to_euros.__code__.co_names + quote_special.__code__.co_names, "Neither function should read or set GBP_TO_EUR; the rate should arrive as an argument."
assert list(_inspect.signature(to_euros).parameters) == ["pounds", "rate"], "to_euros should take (pounds, rate)."
assert list(_inspect.signature(quote_special).parameters) == ["pounds", "rate"], "quote_special should take (pounds, rate)."
assert to_euros(100, 1.17) == 117.0 and to_euros(19.99, 1.2) == 23.99, "to_euros converts and rounds to 2 places."
assert quote_special(100, 1.17) == 105.3, f"10% off €117.00 is €105.30; got {quote_special(100, 1.17)}."
_before = to_euros(250, 1.17)
for _ in range(3):
    quote_special(250, 1.17)
assert to_euros(250, 1.17) == _before == 292.5, "Quoting a special customer must not change anyone else's price."
assert to_euros(100, 1.5) == 150.0 and quote_special(100, 1.5) == 135.0, "Different rates work side by side, with no shared setting to reset."
"SUCCESS: The rate is now an input, so no call can change another call's answer, and each function can be tested with any rate."
```

Hint: Add `rate` as a parameter of both functions. `quote_special` passes its rate to `to_euros` and applies the 10% to the result. Remove the global variable and the `global` line completely.
:::

::: challenge Untangle the timesheet [hard]
`print_timesheet(text)` reads lines like `"Ana,Mon,7.5"`, adds up each worker's hours, pays £14 an hour up to 40 hours a week and £21 an hour beyond that, and prints a line per worker. It does all of that in one function. Split it into four functions with these exact names and behaviours:

- `parse_shifts(text)`: return a list of `(name, day, hours)` tuples, with `hours` a float, skipping blank lines;
- `weekly_hours(shifts)`: return a dict mapping each name to total hours;
- `weekly_pay(hours)`: return the pay for one worker's total hours, rounded to 2 places;
- `format_timesheet(hours_by_name)`: return the report text: one line per worker in alphabetical order, `f"{name:<8}{hours:>5.1f} h  £{pay:8.2f}"`, joined with newlines.

Then make `print_timesheet(text)` a one-line chain of them. The test checks each function on its own.

```python starter
def print_timesheet(text):
    totals = {}
    for line in text.strip().splitlines():
        if not line.strip():
            continue
        name, day, hours = line.split(",")
        totals[name] = totals.get(name, 0) + float(hours)
    for name in sorted(totals):
        h = totals[name]
        pay = 14 * min(h, 40) + 21 * max(h - 40, 0)
        print(f"{name:<8}{h:>5.1f} h  £{round(pay, 2):8.2f}")

print_timesheet("""Ana,Mon,7.5
Ben,Mon,9
Ana,Tue,8
Ben,Tue,10
Ben,Wed,12
Ben,Thu,11
""")
```

```python solution
def parse_shifts(text):
    shifts = []
    for line in text.strip().splitlines():
        if not line.strip():
            continue
        name, day, hours = line.split(",")
        shifts.append((name, day, float(hours)))
    return shifts

def weekly_hours(shifts):
    totals = {}
    for name, day, hours in shifts:
        totals[name] = totals.get(name, 0) + hours
    return totals

def weekly_pay(hours):
    return round(14 * min(hours, 40) + 21 * max(hours - 40, 0), 2)

def format_timesheet(hours_by_name):
    return "\n".join(f"{name:<8}{h:>5.1f} h  £{weekly_pay(h):8.2f}" for name, h in sorted(hours_by_name.items()))

def print_timesheet(text):
    print(format_timesheet(weekly_hours(parse_shifts(text))))

print_timesheet("""Ana,Mon,7.5
Ben,Mon,9
Ana,Tue,8
Ben,Tue,10
Ben,Wed,12
Ben,Thu,11
""")
```

```python test
import io as _io, contextlib as _ctx
for _f in ["parse_shifts", "weekly_hours", "weekly_pay", "format_timesheet", "print_timesheet"]:
    assert _f in dir(), f"Define {_f}."
_text = "Ana,Mon,7.5\nBen,Mon,9\n\nAna,Tue,8\n"
assert parse_shifts(_text) == [("Ana", "Mon", 7.5), ("Ben", "Mon", 9.0), ("Ana", "Tue", 8.0)], f"parse_shifts gave {parse_shifts(_text)!r}."
assert weekly_hours([("Ana", "Mon", 7.5), ("Ben", "Mon", 9.0), ("Ana", "Tue", 8.0)]) == {"Ana": 15.5, "Ben": 9.0}, "weekly_hours adds each worker's hours."
assert weekly_hours([]) == {}, "No shifts, no totals."
assert weekly_pay(40) == 560 and weekly_pay(10) == 140 and weekly_pay(0) == 0, "Up to 40 hours: £14 an hour."
assert weekly_pay(42) == 602 and weekly_pay(40.5) == 570.5, "Hours beyond 40 pay £21: 42 h is 560 + 42 = 602."
_out = format_timesheet({"Ben": 42.0, "Ana": 15.5})
assert _out == "Ana      15.5 h  £  217.00\nBen      42.0 h  £  602.00", f"format_timesheet gave {_out!r}."
_buf = _io.StringIO()
with _ctx.redirect_stdout(_buf):
    parse_shifts(_text); weekly_hours([("A", "M", 1.0)]); weekly_pay(45); format_timesheet({"A": 1.0})
assert _buf.getvalue() == "", "Only print_timesheet should print; the other four return values."
_real_pay = weekly_pay
weekly_pay = lambda hours: 1.0
try:
    assert "£    1.00" in format_timesheet({"A": 1.0}), "format_timesheet should call weekly_pay, so the pay rule lives in one place."
finally:
    weekly_pay = _real_pay
_real_fmt = format_timesheet
format_timesheet = lambda hours_by_name: "FORMATTED"
try:
    _buf = _io.StringIO()
    with _ctx.redirect_stdout(_buf):
        print_timesheet("Ana,Mon,1\n")
    assert _buf.getvalue() == "FORMATTED\n", "print_timesheet should chain the functions and print what format_timesheet returns."
finally:
    format_timesheet = _real_fmt
_buf = _io.StringIO()
with _ctx.redirect_stdout(_buf):
    print_timesheet("Ana,Mon,7.5\nBen,Mon,9\nAna,Tue,8\nBen,Tue,10\nBen,Wed,12\nBen,Thu,11\n")
assert _buf.getvalue() == "Ana      15.5 h  £  217.00\nBen      42.0 h  £  602.00\n", f"print_timesheet printed {_buf.getvalue()!r}."
"SUCCESS: Parsing, totalling, pay rules and layout each live in one function, so an overtime change touches weekly_pay alone and every piece can be tested on its own."
```

Hint: Lift each stage out of the loop. Parsing builds tuples instead of totals. Totalling loops over those tuples. The pay formula becomes `weekly_pay`, and the report becomes a `"\n".join(...)` over `sorted(hours_by_name.items())`. Then `print_timesheet` is `print(format_timesheet(weekly_hours(parse_shifts(text))))`.
:::

## What you learned

- Design decides what changes cost. Two programs with the same output can differ greatly in how easily they are tested, extended and fixed.
- Cohesion: a piece of code should have one job and one reason to change. A function that parses, calculates and prints changes for every request, and copies of it drift apart.
- Coupling: pieces should depend on each other as little as possible. Shared mutable globals are the tightest coupling, because any code anywhere can change what a function does. Pass values in as arguments instead.
- Keep calculations pure (values in, values out) and push printing, files, clocks and randomness to a thin outer layer. Pure functions are tested by calling them and comparing results.

The next lesson takes the first principle further: what "one responsibility" means for a class, and how to split a class that does too much.
