---
title: "Time and Locale: Instants, Zones and Places"
runtime: python
---

A card transaction at 23:30 on the 30th of November, in New York, happened at 04:30 on the 1st of December in UTC. Which month's spending is it? The answer isn't in the clock; it's a decision about what Ledger's dates *mean*. Time is the other part of every domain that looks simple and isn't: days that are 23 hours long, times that happen twice, times that never happen, clocks that jump backwards, and a calendar that every country writes differently. Money has the same problem in a smaller way: 1,366.89 in New York is 1.366,89 in Berlin, and 13,66.89 would be a mistake anywhere except as part of Indian grouping, where 12,34,567.89 is right. This last lesson of the stage measures time's traps with Python's own time-zone support (and finds that on Windows it doesn't work out of the box), decides what Ledger's dates are, and teaches `Money` to be written as each place writes it.

**By the end you can:**

- Tell instants from local times, and convert between them with time zones, through UTC.
- Recognise daylight saving's traps: days that aren't 24 hours, times that happen twice or never.
- Write times in ISO 8601, choose the right clock for a duration, and say what leap seconds and other calendars mean for a program.
- Separate internationalization from localization, and format numbers and money by place.

**You need:** 02-08-02 (dates versus instants, Ledger's history), 02-08-01 (`Money`), 02-09-01 (`MODULES.md`), 01-06-05 (installing a pinned package). Commands run inside `ledger`.

## One moment, two dates

An **instant** is a point in time, the same everywhere: the moment the payment was made. A **local time** is what a clock on a wall says, somewhere: 23:30 in New York. A **time zone** (`America/New_York`) is the set of rules that turns one into the other, including when the clocks change, which governments decide and occasionally change. **UTC** is the reference everyone converts through, with no daylight saving. Python's `zoneinfo` module knows the world's time zones, from the IANA time zone database. Try it, in `ledger`:

```
.venv/bin/python -c "import zoneinfo; print(zoneinfo.ZoneInfo('Europe/London'))"
```

(On Windows, `.venv/Scripts/python`.) On macOS and Linux, which keep the time zone database as part of the system, it prints `Europe/London`. On Windows it ends:

```
zoneinfo._common.ZoneInfoNotFoundError: 'No time zone found with key Europe/London'
```

Windows doesn't ship the IANA database in a form Python reads, so Python looks for a package called `tzdata` instead. Install it, pinned as Kit's tools are (01-06-05):

```
.venv/bin/python -m pip install tzdata==2026.6
```

and the same command prints `Europe/London`. (Pinning matters more than usual here: governments change their time-zone rules a few times a year, and each `tzdata` release carries the latest. A program that converts future times needs the release that was current when it was built, and an update when the rules change.)

Now measure the traps. Create `time_facts.py`:

```python file=ledger/time_facts.py
import datetime
import time
from zoneinfo import ZoneInfo

UTC = datetime.timezone.utc
LONDON = ZoneInfo("Europe/London")
NEW_YORK = ZoneInfo("America/New_York")
HOUR = datetime.timedelta(hours=1)

# One instant, two calendar dates: 23:30 on 30 November in New York is
# already 1 December in UTC.
late = datetime.datetime(2026, 11, 30, 23, 30, tzinfo=NEW_YORK)
print("New York", late.isoformat(), "is", late.astimezone(UTC).isoformat())

# Days that aren't 24 hours: London's clocks change on 29 March and on
# 25 October 2026. Subtracting two times in the same zone gives wall-clock
# time; converting both to UTC first gives the time that really passed.
for day in (datetime.date(2026, 3, 29), datetime.date(2026, 10, 25), datetime.date(2026, 11, 16)):
    start = datetime.datetime.combine(day, datetime.time(), LONDON)
    end = datetime.datetime.combine(day + datetime.timedelta(days=1), datetime.time(), LONDON)
    real = (end.astimezone(UTC) - start.astimezone(UTC)) / HOUR
    print(day, "in London: wall clock", (end - start) / HOUR, "hours, really", real)

# A local time that happens twice (the clocks go back at 02:00 to 01:00), and
# one that never happens (they jump from 01:00 to 02:00).
twice = datetime.datetime(2026, 10, 25, 1, 30, tzinfo=LONDON)
print("01:30 on 25 October:", twice.isoformat(), "and", twice.replace(fold=1).isoformat())
never = datetime.datetime(2026, 3, 29, 1, 30, tzinfo=LONDON)
print("01:30 on 29 March becomes", never.astimezone(UTC).astimezone(LONDON).isoformat())

# Two clocks: the wall clock can be set, the monotonic one only goes forward.
print("time.time adjustable:", time.get_clock_info("time").adjustable,
      "| time.monotonic monotonic:", time.get_clock_info("monotonic").monotonic)
```

Each block is one fact. A `datetime` with a `tzinfo` is **aware**: it knows its zone, so it's an instant. `astimezone(UTC)` converts it. `isoformat()` writes **ISO 8601**: date, `T`, time, and the offset from UTC (`-05:00`), the one format that sorts correctly as text and means one thing everywhere. `time.get_clock_info` describes Python's clocks. `time_facts.py` is a new module, so add it to `MODULES.md`'s Layers table:

```
| time_facts.py | tool | Showing how time zones and clocks behave |
```

Save both, and run it:

```
.venv/bin/python time_facts.py
```

```
New York 2026-11-30T23:30:00-05:00 is 2026-12-01T04:30:00+00:00
2026-03-29 in London: wall clock 24.0 hours, really 23.0
2026-10-25 in London: wall clock 24.0 hours, really 25.0
2026-11-16 in London: wall clock 24.0 hours, really 24.0
01:30 on 25 October: 2026-10-25T01:30:00+01:00 and 2026-10-25T01:30:00+00:00
01:30 on 29 March becomes 2026-03-29T02:30:00+01:00
time.time adjustable: True | time.monotonic monotonic: True
```

```check
run "cd ledger; .venv/Scripts/python -c \"import zoneinfo; print(zoneinfo.ZoneInfo('Europe/London'))\"" stdout="Europe/London" -- Python should find the Europe/London time zone (on Windows, after pip install tzdata==2026.6).
run "cd ledger; .venv/Scripts/python time_facts.py" stdout="New York 2026-11-30T23:30:00-05:00 is 2026-12-01T04:30:00+00:00" -- 23:30 on 30 November in New York should be 1 December in UTC.
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 23 modules" -- time_facts.py should be placed in MODULES.md.
```

## Days that aren't a day

Read the output line by line.

The first: one instant, two calendar dates. Which month the payment belongs to depends on whose calendar you use.

```predict
question: On 29 March 2026, London's clocks jump from 01:00 to 02:00. time_facts.py subtracts midnight from the next midnight, both in London. What does the plain subtraction give, and how long did the day really last?
choice: 24 hours, and really 24
choice: 23 hours, and really 23
choice: 24 hours by the subtraction, and really 23
answer: 24 hours by the subtraction, and really 23
explain: Python subtracts two times in the same zone as wall-clock times: midnight to midnight is 24 hours on the clock. Converted to UTC first, the difference is what really passed: 23 hours, because an hour was skipped. Code that adds 24 hours to get "the same time tomorrow", or divides a day's total by 24, is wrong twice a year in most of the world.
```

The next three lines show exactly that: the spring day *really* lasts 23 hours and the autumn day 25, while the plain subtraction says 24 every time. The rule: to measure how much time passed, subtract **instants** (in UTC); to say "the same wall-clock time tomorrow", add a day to the **date** and attach the zone again.

Then a local time that happens twice: when the clocks go back at 02:00, 01:30 comes round again, first at `+01:00` and then at `+00:00`, and Python tells them apart with `fold`. And one that never happens: 01:30 on 29 March doesn't exist in London, and converting it through UTC moves it to 02:30. A program that schedules something "at 01:30 every night" has to decide what happens on both of those nights, or it runs twice, or not at all.

The last line is about clocks. `time.time()`, the **wall clock**, can be adjusted: the system sets it from the network, a person changes it, and it can jump backwards. `time.monotonic()` only goes forward, so it's the one for measuring **durations**, which is why `timing.py` uses `time.perf_counter()` (a monotonic clock with high resolution, 01-02-04). A duration measured with the wall clock can come out negative.

Three more facts that programs meet:

- **Leap seconds.** The Earth's rotation is irregular, so 27 leap seconds have been added to UTC since 1972, the last at the end of 2016, and the clocks' keepers have decided to stop adding them by 2035. Python's `datetime` pretends they don't exist (a minute always has 60 seconds), as do most systems, which smear the extra second over a day instead. Programs that need exact physical time (navigation, physics) use a different time scale altogether.
- **Calendars.** Python's dates are the Gregorian calendar extended backwards (the proleptic Gregorian calendar). Many places also use other calendars, for dates, holidays or financial years; a "month" or a "year" is a question about which calendar, as 02-08-02's month-end rule showed in a small way.
- **Durations versus periods.** "30 days" is a duration; "one month" is a period, whose length depends on where it starts. Store the one you mean.

```check
run "cd ledger; .venv/Scripts/python time_facts.py" stdout="2026-03-29 in London: wall clock 24.0 hours, really 23.0" -- The spring day should really be 23 hours, though the plain subtraction says 24.
run "cd ledger; .venv/Scripts/python time_facts.py" stdout="01:30 on 25 October: 2026-10-25T01:30:00+01:00 and 2026-10-25T01:30:00+00:00" -- 01:30 on 25 October should happen twice, an hour apart.
```

## Ledger's dates

So which month is the New York payment? For Ledger, the answer is a decision, and it has been one since 02-04-02 without being written down: a transaction's date is the **calendar date the bank's statement gives**, a date with no time and no zone (02-08-02), and Ledger never converts it. The household reports by their own calendar; the bank has already decided, for its own customers, which day each payment fell on; and a date can't land in a different month because a laptop travelled. Changes in the history are different: when something was recorded is an instant, and 02-08-02 stored a date for simplicity, with the cost written down.

Record the decision where builders will look. In `SPEC.md`, under `### Assumptions`, add a line after A5:

```
- A6. A transaction's date is the calendar date the statement gives, with no time and no time zone; Ledger never converts it.
```

```check
contains ledger/SPEC.md "A6. A transaction's date is the calendar date the statement gives" -- SPEC.md should record what a transaction's date means, as assumption A6.
```

## Money for different places

Two words for the work of making software fit different places. **Internationalization** (i18n) is preparing the code: no separator, date format or message written into the logic, so each can vary. **Localization** (l10n) is the varying itself: German separators, a French translation, a Japanese date order. Ledger has one currency (A2), but the household might be German, or a person reading a report might be: 1,366.89 and 1.366,89 are the same amount, written for two places. Replace `money.py` with:

```python file=ledger/money.py
import dataclasses
import re

AMOUNT = re.compile(r"(-?)(\d+)\.(\d\d)")

# How a few places write an amount: the separator between groups of three
# digits, and the one before the cents. The amount is the same everywhere;
# only how it's written changes (localization). Real software takes these
# rules from a library (Babel, ICU) that carries them for every place.
PLACES = {"en-US": (",", "."), "en-GB": (",", "."), "de-DE": (".", ",")}


# An amount of money, as a value object: two Moneys with the same cents are
# the same amount, a Money can't be changed once made, and it does the
# reading, adding and writing that money needs, so no other code has to
# handle bare cents. One currency (SPEC.md's A2).
@dataclasses.dataclass(frozen=True, order=True)
class Money:
    cents: int

    def __post_init__(self):
        if type(self.cents) is not int:
            raise TypeError(f"Money needs a whole number of cents, not {self.cents!r}")

    # "-4.50" is Money(-450): an optional minus, digits, a point, two digits.
    @classmethod
    def parse(cls, text):
        match = AMOUNT.fullmatch(text)
        if match is None:
            raise ValueError(f"{text!r} isn't an amount written like -12.34")
        sign, whole, part = match.groups()
        cents = int(whole) * 100 + int(part)
        return cls(-cents if sign else cents)

    # Money adds to Money and nothing else: Money + 4.5 is a TypeError.
    def __add__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return Money(self.cents + other.cents)

    def __sub__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return Money(self.cents - other.cents)

    def __neg__(self):
        return Money(-self.cents)

    # The sum of some amounts, and Money(0) for none.
    @staticmethod
    def total(amounts):
        result = Money(0)
        for amount in amounts:
            result = result + amount
        return result

    # Split into parts amounts that add up to exactly this one, differing by
    # at most a cent, the larger first: 1.00 in three is 0.34, 0.33, 0.33.
    def split(self, parts):
        if type(parts) is not int or parts < 1:
            raise ValueError(f"can't split into {parts!r} parts")
        share, left = divmod(self.cents, parts)
        return [Money(share + 1) if i < left else Money(share) for i in range(parts)]

    # The amount as a place writes it: 1,366.89 in en-US, 1.366,89 in de-DE.
    def format(self, place):
        if place not in PLACES:
            raise ValueError(f"no rules for writing amounts in {place!r}; known: {', '.join(PLACES)}")
        group, point = PLACES[place]
        size = abs(self.cents)
        whole = f"{size // 100:,}".replace(",", group)
        return f"{'-' if self.cents < 0 else ''}{whole}{point}{size % 100:02d}"

    # 1366.89, and -4.50 for a negative amount: the sign first, then the
    # size's whole part and cents, so that -450 isn't written -5.50.
    def __str__(self):
        size = abs(self.cents)
        return f"{'-' if self.cents < 0 else ''}{size // 100}.{size % 100:02d}"
```

`PLACES` holds each place's two separators: between groups of digits, and before the cents. `format` writes the whole part with Python's own grouping (`f"{n:,}"` puts commas between groups of three), swaps in the place's separator, then the decimal separator and the cents. An unknown place is refused rather than guessed. `__str__` is unchanged: the plain form, for files and tests, stays the same everywhere. Save it, and try it:

```
.venv/bin/python -c "from money import Money; print(Money(136689).format('en-US'), Money(136689).format('de-DE'), Money(-450).format('de-DE'))"
```

It prints `1,366.89 1.366,89 -4,50`. Notice what *doesn't* change: the amount, its cents, and every comparison. Formatting is something done to a value on the way out, at the boundary, like the encodings of 02-11-01. A program that stores "1.366,89" has mixed a place into its data, and every reader in another place gets it wrong.

```check
run "cd ledger; .venv/Scripts/python -c \"from money import Money; print(Money(136689).format('en-US'), Money(136689).format('de-DE'), Money(-450).format('de-DE'), str(Money(136689)))\"" stdout="1,366.89 1.366,89 -4,50 1366.89" -- Money should be written as each place writes it, and str() unchanged.
```

## Tests for formatting

Replace `tests/test_money.py` with:

```python file=ledger/tests/test_money.py
import dataclasses

import pytest

from money import Money


@pytest.mark.parametrize("text", ["1366.89", "0.00", "0.05", "-0.05", "-4.50", "-950.00"])
def test_an_amount_is_written_as_it_was_read(text):
    assert str(Money.parse(text)) == text


def test_a_negative_amount_is_written_with_its_sign_first():
    assert [str(Money(-450)), str(Money(-5))] == ["-4.50", "-0.05"]


def test_amounts_with_the_same_cents_are_the_same_amount():
    assert Money.parse("4.50") == Money(450)
    assert len({Money(450), Money.parse("4.50")}) == 1


def test_an_amount_cannot_be_changed():
    with pytest.raises(dataclasses.FrozenInstanceError):
        Money(450).cents = 500


@pytest.mark.parametrize("bad", [4.5, True, "450"])
def test_money_is_only_ever_whole_cents(bad):
    with pytest.raises(TypeError):
        Money(bad)


def test_money_adds_only_to_money():
    assert Money(450) + Money(50) == Money(500)
    with pytest.raises(TypeError):
        Money(450) + 0.5


def test_the_total_of_nothing_is_zero():
    assert Money.total([]) == Money(0)
    assert Money.total([Money(100), Money(-30)]) == Money(70)


@pytest.mark.parametrize(("cents", "parts", "expected"), [(100, 3, [34, 33, 33]), (95000, 2, [47500, 47500]), (5, 2, [3, 2]), (-100, 3, [-33, -33, -34]), (2, 4, [1, 1, 0, 0])])
def test_a_split_adds_up_exactly_larger_first(cents, parts, expected):
    shares = Money(cents).split(parts)
    assert [share.cents for share in shares] == expected
    assert Money.total(shares) == Money(cents)


@pytest.mark.parametrize("parts", [0, -1, 1.5])
def test_a_split_needs_a_whole_number_of_parts(parts):
    with pytest.raises(ValueError):
        Money(100).split(parts)


@pytest.mark.parametrize(("cents", "place", "expected"), [
    (136689, "en-US", "1,366.89"), (136689, "de-DE", "1.366,89"), (136689, "en-GB", "1,366.89"),
    (-450, "de-DE", "-4,50"), (5, "en-US", "0.05"), (123456789, "de-DE", "1.234.567,89"),
])
def test_an_amount_is_written_as_each_place_writes_it(cents, place, expected):
    assert Money(cents).format(place) == expected


def test_a_place_without_rules_is_refused():
    with pytest.raises(ValueError):
        Money(100).format("xx-XX")
```

The new tests come last: six amounts in three places, including a negative and an amount over a million, and the refusal. The earlier tests are unchanged above them. Run every test (`167 passed`).

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_money.py" stdout="29 passed" -- The money tests, formatting included, should all pass.
```

## total, for a place

Let `total.py` write its report for a place. Replace `total.py` with:

```python file=ledger/total.py
import sys

import store
from money import Money

# Read the month's spending through store.py, and print the total for each
# category, largest first, then the month's total. Every amount is a Money,
# from the moment it's read to the moment it's written: plainly, or as the
# place given with --place writes it (total.py --place de-DE).
place = sys.argv[sys.argv.index("--place") + 1] if "--place" in sys.argv[:-1] else None
show = (lambda amount: amount.format(place)) if place else str
totals = {}
for row in store.transactions():
    totals[row["category"]] = totals.get(row["category"], Money(0)) + Money(int(row["cents"]))

for category, amount in sorted(totals.items(), key=lambda item: item[1], reverse=True):
    print(f"{category:12} {show(amount):>9}")
print(f"{'total':12} {show(Money.total(totals.values())):>9}")
```

`--place` is read from the arguments (without `kitargs`, which is Kit's), and `show` is either `str` or a function that formats for the place: the report's logic doesn't change, only the last step before printing. Save it, and run it both ways:

```
.venv/bin/python total.py
.venv/bin/python total.py --place de-DE
```

The first prints exactly what it always has, ending `total          1366.89`; the second ends `total         1.366,89`. Commit everything:

```
git add time_facts.py MODULES.md SPEC.md money.py tests/test_money.py total.py
git commit -m "Measure time's traps, decide what a date is, and write money by place"
```

```check
run "cd ledger; .venv/Scripts/python total.py" stdout="total          1366.89" -- Without --place, total.py should print as it always has.
run "cd ledger; .venv/Scripts/python total.py --place de-DE" stdout="total         1.366,89" -- With --place de-DE, it should write amounts the German way.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="167 passed" -- Every test, 167 in all, should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('def format' in git('show', 'HEAD:money.py').stdout, 'A6.' in git('show', 'HEAD:SPEC.md').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit the time facts, the module table, the spec, money, its tests and total.py.
```

**What else, and why not.** You could use Python's `locale` module (`locale.setlocale`, `locale.format_string`): it uses the operating system's rules, which differ between Windows, macOS and Linux, need locale names that differ too (`de_DE` against `German_Germany`), and change process-wide state; for a program whose tests must pass everywhere, explicit rules are easier to trust. You could use a localization library (Babel, ICU) that carries the rules for every place from Unicode's CLDR data: the right choice the moment Ledger supports more than a few places, and the reason `PLACES` says so. You could store times as local times with no zone, as many systems do: then two records from different places can't be compared, and every daylight-saving change makes some of them ambiguous.

## Your turn: lakh and crore

Indian English groups digits differently: the last three, then groups of **two**. Twelve lakh thirty-four thousand five hundred and sixty-seven is 12,34,567, and a crore (ten million) is 1,00,00,000. Add `en-IN` to `Money.format`: twelve lakh thirty-four thousand five hundred and sixty-seven rupees and eighty-nine paise is `12,34,567.89`, and 1,000.00 is still `1,000.00` (three digits group as everywhere). Python's `f"{n:,}"` can't do this grouping, so write it: a small function that groups a whole number's digits the Indian way. Add tests to `tests/test_money.py`, including a negative amount and amounts under a thousand, and commit `money.py` and the tests.

```hints
nudge: Write the digits out: 1234567. Take the last three off (567). What's left (1234) is grouped in twos from the right: 12, 34. How does that change for 1234 (one comma) and 123 (none)?
concept: Split off the last three digits; then take two digits at a time from the right of what's left, until two or fewer remain; join everything with commas. The sign and the cents are handled by format as before, so the grouping function only ever sees a whole number of rupees. Add "en-IN" to PLACES (comma and point), and in format, use the new function for en-IN instead of f"{n:,}".
shape: def indian_groups(number): digits = str(number); if len(digits) <= 3: return digits; head, tail = digits[:-3], digits[-3:]; pairs = []; while len(head) > 2: pairs.insert(0, head[-2:]); head = head[:-2]; return ",".join([head, *pairs, tail]). In format: whole = indian_groups(size // 100) if place == "en-IN" else f"{size // 100:,}".replace(",", group).
answer: In money.py, add "en-IN": (",", ".") to PLACES, and before the class:
~~~python
# Indian grouping (lakh and crore): the last three digits, then groups of
# two: 1234567 is 12,34,567.
def indian_groups(number):
    digits = str(number)
    if len(digits) <= 3:
        return digits
    head, tail = digits[:-3], digits[-3:]
    pairs = []
    while len(head) > 2:
        pairs.insert(0, head[-2:])
        head = head[:-2]
    return ",".join([head, *pairs, tail])
~~~
and in format:
~~~python
        if place == "en-IN":
            whole = indian_groups(size // 100)
        else:
            whole = f"{size // 100:,}".replace(",", group)
~~~
In tests/test_money.py:
~~~python
@pytest.mark.parametrize(("cents", "expected"), [(123456789, "12,34,567.89"), (100000, "1,000.00"), (10000000, "1,00,000.00"),
                                                 (99, "0.99"), (-1234567890, "-1,23,45,678.90")])
def test_india_groups_by_lakh_and_crore(cents, expected):
    assert Money(cents).format("en-IN") == expected
~~~
Then git add money.py tests/test_money.py and git commit -m "Write amounts the Indian way: lakh and crore". The tempting slip is grouping every pair from the right, giving 1,23,45,67.89: the last group is three digits, then twos.
```

```check
run "cd ledger; .venv/Scripts/python -c \"from money import Money; print(Money(123456789).format('en-IN'), Money(100000).format('en-IN'), Money(10000000).format('en-IN'), Money(99).format('en-IN'), Money(-1234567890).format('en-IN'))\"" stdout="12,34,567.89 1,000.00 1,00,000.00 0.99 -1,23,45,678.90" -- en-IN should group the last three digits, then twos.
run "cd ledger; .venv/Scripts/python -c \"from money import Money; print(Money(136689).format('en-US'), Money(136689).format('de-DE'))\"" stdout="1,366.89 1.366,89" -- The other places should be written as before.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="passed" without="failed" -- Every test should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('en-IN' in git('show', 'HEAD:money.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit money.py and its tests.
```

**What these checks establish, and what they don't.** They check that Python finds time zones (with `tzdata` on Windows), that the measured facts hold: one instant on two dates, days of 23 and 25 hours, a time that happens twice; that the meaning of a transaction's date is written into the spec; and that amounts are written by place, Indian grouping included, without changing any amount or the plain output. They can't check that a place's rules are right beyond the few examples here, which is why real localization uses CLDR's data rather than a table typed by hand, or that Ledger will never need time zones: that's assumption A6, and the day the household's bank starts sending times with zones, it's the line to revisit.

## What you can do now

- An **instant** is the same everywhere; a **local time** belongs to a place; a **time zone** converts between them, through **UTC**. Python: aware `datetime`s and `zoneinfo` (with `tzdata` pinned on Windows).
- **Daylight saving** makes days of 23 and 25 hours, times that happen twice (`fold`) and times that never happen. Measure durations between **instants**; move calendar times by **dates**.
- Write times in **ISO 8601** with their offset. Measure durations with a **monotonic** clock; the wall clock can jump. Most systems ignore **leap seconds**; **calendars** and **periods** are domain questions.
- Decide what each date in the domain **means**, and write it in the spec (A6).
- **Internationalization** prepares the code; **localization** fills in each place's rules. Format money and numbers **on the way out**, never in the data.

**Next:** stage 2 ends here. Stage 3 turns to structure: abstraction and interfaces, coupling and cohesion, layers and the direction of dependencies enforced in code, the failure modes of plausible-but-wrong code, refactoring, and how to keep a codebase that agents work in from becoming mud.
