---
title: 17.4 — Warning Before the Limit: How Many Days Are Left?
track: Time Series — Spindle Bearing Watch
runtime: none
concepts: time-series
revisits: linear-regression, descriptive-statistics, aggregation, mathematical-functions, numpy, testing
notebook: ml-time-series
lab: 19
problem: An 8-hour forecast tells the shift lead what's coming this afternoon. The maintenance planner needs something else: how many days until the bearing reaches its limit, so the rebuild can be booked, the parts ordered and the work moved to another machine. How do you turn hourly readings into "about a week left", and how far can you trust it?
---

Lesson 17.3's forecast answers a short-range question. Planning a bearing replacement needs a long-range one, measured in days: **how long until the limit?** In maintenance this is called the **remaining useful life**.

> **Remaining useful life (RUL)**: the time left before a component reaches the condition at which it must be replaced or repaired. Estimating it from sensor readings, so that work is done just before it's needed rather than on a fixed schedule or after a breakdown, is **predictive maintenance**.
>
> *Picture it as* a tread-depth gauge on a tyre. You don't change tyres every 10,000 miles regardless, or wait for a blow-out; you measure the tread, see how fast it's going, and change them before the legal limit.

The method is the simplest one that works, and the one most real condition-monitoring systems start with: **one clean number per day, a straight line through the last few days, and where the line meets the limit**.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_health.py provided
# Tests for health.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_health.py
import math
from datetime import date, datetime, timedelta

import numpy as np
from pytest import approx

WEEKDAYS = [date(2026, 1, day) for day in (5, 6, 7, 8, 9)]          # Monday to Friday


def test_daily_running_mean_averages_10_00_to_the_end_of_the_shift():
    import health
    times = [datetime(2026, 1, 5) + timedelta(hours=h) for h in range(7 * 24)]
    values = np.array([float(when.hour) for when in times])
    days, means = health.daily_running_mean(times, values)
    assert days == WEEKDAYS
    assert means == approx([15.5] * 5)                               # the mean of hours 10 to 21


def test_days_to_limit_follows_a_straight_rise():
    import health
    assert health.days_to_limit(WEEKDAYS, np.array([40.0, 41.0, 42.0, 43.0, 44.0]), limit=50) == approx(6.0)


def test_days_to_limit_counts_calendar_days_not_readings():
    import health
    days = WEEKDAYS + [date(2026, 1, 12)]                            # the next Monday
    means = np.array([40.0, 41.0, 42.0, 43.0, 44.0, 47.0])         # 1 °C per calendar day
    assert health.days_to_limit(days, means, limit=50) == approx(3.0)


def test_days_to_limit_uses_only_the_last_window_days():
    import health
    means = np.array([30.0, 30.0, 30.0, 43.0, 44.0])
    assert health.days_to_limit(WEEKDAYS, means, limit=50, window=2) == approx(6.0)


def test_days_to_limit_when_flat_falling_or_already_over():
    import health
    assert health.days_to_limit(WEEKDAYS, np.full(5, 40.0), limit=50) == math.inf
    assert health.days_to_limit(WEEKDAYS, np.array([44.0, 43.0, 42.0, 41.0, 40.0]), limit=50) == math.inf
    assert health.days_to_limit(WEEKDAYS, np.array([48.0, 49.0, 50.0, 51.0, 52.0]), limit=50) == 0.0
```

- **`date`** is like `datetime` without the time of day: just a calendar day.
- **The calendar-days test** has a weekend in it: Friday's 44 °C becomes Monday's 47 °C, a rise of 3 °C over 3 calendar days, so the rise is 1 °C per day all along. An estimate that counted *readings* would see a jump of 3 °C in one step and get the rate wrong.
- **`math.inf`** is Python's infinity: a float bigger than any other number. "Never, at this rate" is infinitely many days.

```check
file tests/test_health.py -- Click "Create provided tests/test_health.py" above.
```

## One clean number per day

The hourly readings swing by over 20 °C every day as the spindle starts and stops, which buries a rise of a few tenths of a degree per day. So reduce each day to one number that leaves out everything except the bearing's condition:

- **only running hours**, because a stopped spindle's temperature is the room's, not the bearing's;
- **only from 10:00**, because the bearing takes about four hours after the 06:00 start to come close to its running temperature (lesson 17.1's weekday profile: 27 °C at 06:00, 39 °C at 10:00, then only slowly up to 42 °C). The warm-up would add noise that depends on how cold the morning was.

> **A condition indicator** (or **health indicator**): a number computed from raw readings under controlled, comparable conditions, chosen so that it changes when the component's condition changes and as little as possible otherwise.
>
> *Picture it as* measuring a part only after it has reached the inspection room's temperature. The part hasn't changed, but measuring it hot off the machine gives you a different number every time.

Create `health.py` with the first function:

```python file=health.py
from datetime import date, datetime

import numpy as np

from features import running


def daily_running_mean(times: list[datetime], values: np.ndarray) -> tuple[list[date], np.ndarray]:
    """For each day the spindle ran, its average temperature from 10:00 to the end of the shift."""
    days, readings = [], []
    for when, value in zip(times, values):
        if running(when) and when.hour >= 10:
            if not days or days[-1] != when.date():
                days.append(when.date())
                readings.append([])
            readings[-1].append(value)
    return days, np.array([np.mean(day) for day in readings])
```

- **`from features import running`** reuses lesson 17.3's shift schedule rather than writing it out again. If the shifts change, there's one place to change them.
- **`when.date()`** is the calendar day of a `datetime`.
- **`if not days or days[-1] != when.date()`**: the first kept reading of a new day starts a new, empty list in `readings`. Every kept reading is then added to the last list, **`readings[-1]`**, which is today's.
- The result has only **working days**: weekends have no running hours, so they get no entry at all.

```check
run ".venv/Scripts/python -m pytest -q tests/test_health.py -k daily" label="one number per working day: the mean from 10:00 to the end of the shift" -- keep a reading when running(when) and when.hour >= 10; start a new list in readings when the day changes
```

## How many days are left?

Fit a straight line through the last 8 working days' numbers (about a week and a half), and see where it meets the limit. Lesson 3.1 fitted lines by gradient descent and lesson 3.4 with scikit-learn; for a single input, NumPy's **`np.polyfit(x, y, 1)`** does the same least-squares fit in one call. It returns the line's slope and its intercept (`1` is the degree: a straight line).

The trick is choosing *x*. Count days **back from the last day**: the last day is 0, the day before is −1, last Friday seen from a Monday is −3. Then the line's intercept is its value **today**, and the line says:

$$\text{temperature}(x) = \text{now} + \text{slope} \times x$$

It reaches the limit when $\text{now} + \text{slope} \times x = \text{limit}$, so after

$$x = \frac{\text{limit} - \text{now}}{\text{slope}} \text{ days.}$$

Using the line's value for today, not today's reading, means one noisy day doesn't throw the estimate around: the line has been fitted through eight days.

Two cases need care:

- **Already at or over the limit**: zero days left.
- **Flat or falling**: the formula would divide by zero or give a negative number of days, and neither means anything. Return infinity: at this rate, never. And "flat" needs a definition. Take five readings of exactly 40.0: in exact arithmetic the slope is 0, but `np.polyfit` computes in floating point, and the slope it returns can be something like 0.000000000000007. Divide 10 by that and you get "the limit in 1,400,000,000,000,000 days", which is nonsense dressed up as an answer. So treat any rise slower than **0.01 °C per day** as no rise.

Replace `health.py` with the whole module:

```python file=health.py
import math
from datetime import date, datetime

import numpy as np

from features import running

NO_RISE = 0.01   # °C per day: a slower rise than this is treated as no rise at all


def daily_running_mean(times: list[datetime], values: np.ndarray) -> tuple[list[date], np.ndarray]:
    """For each day the spindle ran, its average temperature from 10:00 to the end of the shift."""
    days, readings = [], []
    for when, value in zip(times, values):
        if running(when) and when.hour >= 10:
            if not days or days[-1] != when.date():
                days.append(when.date())
                readings.append([])
            readings[-1].append(value)
    return days, np.array([np.mean(day) for day in readings])


def days_to_limit(days: list[date], means: np.ndarray, limit: float, window: int = 8) -> float:
    """Days from the last day until a straight line through the last `window` days reaches the limit."""
    x = np.array([(day - days[-1]).days for day in days[-window:]])
    slope, now = np.polyfit(x, means[-window:], 1)
    if now >= limit:
        return 0.0
    if slope < NO_RISE:
        return math.inf
    return float((limit - now) / slope)
```

- **`days[-window:]`** is the last `window` days (all of them, if there are fewer).
- **`(day - days[-1]).days`**: subtracting two `date`s gives a `timedelta`, and **`.days`** is its length in whole days. Every one is 0 or negative.
- **`slope, now = np.polyfit(...)`**: `polyfit` returns the highest power's weight first, so for a straight line it's the slope, then the intercept.

```check
run ".venv/Scripts/python -m pytest -q tests/test_health.py" label="days to the limit along a straight line, in calendar days, from the last window days only" -- x = days back from the last day; slope, now = np.polyfit(x, means[-window:], 1); (limit - now) / slope; inf when slope < NO_RISE
```

## Would it have warned in time?

An estimate is only worth something if it would have worked on the past. Backtest it: stand on each working day in turn, estimate from that day's history only, and compare with what really happened. The bearing maker's limit for this spindle under load is **46 °C**, and the planner wants a warning when the limit looks less than **14 days** away, which is enough time to order a bearing and book the rebuild. Create `backtest.py`:

```python file=backtest.py
from datetime import date

import health
import readings

LIMIT = 46.0          # °C: the bearing maker's limit for this spindle under load
WARN_WITHIN = 14      # days: warn when the limit looks less than two weeks away
SHOW_FROM = date(2026, 2, 16)

times, values = readings.fill(*readings.load("data/spindle.csv"))
days, means = health.daily_running_mean(times, values)
crossed = next(day for day, mean in zip(days, means) if mean >= LIMIT)

first_warning = None
print("day         running mean  days left (estimate)  days left (actual)")
for k in range(7, len(days)):
    estimate = health.days_to_limit(days[: k + 1], means[: k + 1], LIMIT)
    warn = estimate <= WARN_WITHIN
    if warn and first_warning is None:
        first_warning = days[k]
    if days[k] >= SHOW_FROM:
        print(f"{days[k]}  {means[k]:9.1f}  {estimate:16.1f}  {(crossed - days[k]).days:18d}{'  WARN' if warn else ''}")
print(f"\nlimit first reached on {crossed}; first warning on {first_warning}, {(crossed - first_warning).days} days before")
```

- **`next(day for day, mean in zip(days, means) if mean >= LIMIT)`**: a generator expression (like a list comprehension, but producing items one at a time), and **`next`** takes the first item it produces: the first day over the limit.
- **`days[: k + 1]`** is the history up to and including day `k`: what you'd have known on that day. This is the backtest's one rule, written as a slice.
- **`range(7, len(days))`** starts on the eighth working day, the first with a full window behind it. Every day is backtested (so `first_warning` would catch a false alarm in the healthy weeks), but only the days from 16 February are printed.

```powershell
.venv\Scripts\python backtest.py
```

```text
day         running mean  days left (estimate)  days left (actual)
2026-02-16       40.8             168.1                  14
2026-02-17       40.7             125.2                  13
2026-02-18       41.2              57.8                  12
2026-02-19       41.8              39.0                  11
2026-02-20       41.5              35.9                  10
2026-02-23       43.0              18.9                   7
2026-02-24       43.2              12.4                   6  WARN
2026-02-25       43.9               6.8                   5  WARN
2026-02-26       44.1               5.3                   4  WARN
2026-02-27       44.5               4.2                   3  WARN
2026-03-02       46.4               0.0                   0  WARN
2026-03-03       47.0               0.0                  -1  WARN
2026-03-04       47.5               0.0                  -2  WARN
2026-03-05       48.3               0.0                  -3  WARN
2026-03-06       49.4               0.0                  -4  WARN

limit first reached on 2026-03-02; first warning on 2026-02-24, 6 days before
```

Read it as the planner would:

- **No false alarms.** Through six healthy weeks of normal day-to-day wobble, the estimate never came near 14 days; the first warning of the whole nine weeks was a real one.
- **The warning came 6 days before the limit.** That's enough to order a bearing and plan a rebuild over a weekend, instead of a breakdown on a Tuesday afternoon.
- **But the estimates were optimistic, every single day.** On 24 February it said 12.4 days; it was 6. On the 23rd it said 18.9; it was 7.

```check
run ".venv/Scripts/python backtest.py" stdout="first warning on 2026-02-24, 6 days before" label="backtest.py: no false alarms, and a first warning 6 days before the limit"
```

```predict
question: Why were the estimates too optimistic every day, rather than sometimes too long and sometimes too short?
choice: Random noise in the readings
choice: The wear speeds up: the line through the last 8 days is shallower than the rise is now, so extending it always reaches the limit too late
choice: The limit of 46 °C was set too high
answer: The wear speeds up: the line through the last 8 days is shallower than the rise is now, so extending it always reaches the limit too late
explain: A failing bearing gets hotter faster as it gets worse: the curve bends upwards. A straight line fitted through the last eight days averages a slow start with a faster finish, so its slope is always behind the real rate, and it always overestimates the time left. Noise would make errors go both ways; an error that is always in the same direction comes from the model's shape. In maintenance, an optimistic estimate is the dangerous kind (the capstone's "too long a life" again), so act on the first warning, not on the number of days it predicts.
```

**Where the straight line stops working:** the line assumes the recent rate carries on. For a bearing that's accelerating towards failure, that's always optimistic. A shorter window reacts faster but jumps around more; a curve can follow the acceleration but needs more data and goes wild when extrapolated. Real systems handle this the way the planner here should: treat the estimate as an upper limit, and set the warning threshold with the bias in mind.

## Your own machine

This chapter's whole method, for any component that wears:

1. **Log a signal that moves with the wear**: temperature, vibration level, spindle load for the same operation, cycle time, motor current.
2. **Build a condition indicator**: one number per day (or per part, or per shift) under comparable conditions. Same operation, same running state, after warm-up.
3. **Get the limit from the maker or from history**: the bearing maker's temperature limit, a vibration severity standard (ISO 20816 for machine vibration), or the value at which past components were replaced.
4. **Backtest the warning** on your history before trusting it: how many false alarms in healthy periods, and how many days of warning before real failures. If you have no failures in your history yet, run it in parallel with your current maintenance schedule until you do.
5. **Keep the hourly forecast too** (lesson 17.3) if someone acts on hours, not days. The two answer different questions for different people, which is the capstone's first lesson: start from the decision.
