---
title: 17.1 — Readings in Time Order: Gaps, Smoothing and Cycles
track: Time Series — Spindle Bearing Watch
trackOrder: 37
runtime: none
support: data/spindle.csv
concepts: time-series
revisits: tabular-data, missing-values, descriptive-statistics, aggregation, numpy, exceptions, testing
notebook: ml-time-series
lab: 19
problem: A sensor on a CNC spindle logs the front bearing's temperature every hour. Every row before this chapter could be shuffled without losing anything; these can't, because each reading only makes sense next to the ones before it. What changes when the order of the rows is part of the data?
---

This is the first of the series' **advanced tracks**: optional chapters for after the capstone, each one a tool you'd pick up because a problem needs it. This one is about data that arrives over time, and it's the one a machine shop runs into most: spindle temperatures, vibration levels, power draw, part counts per shift, scrap rates per week.

The worked example is **predictive maintenance**. A machining centre's spindle has a temperature sensor on its front bearing, logged once an hour. A healthy bearing settles at about 40 °C under load. A bearing that is starting to fail runs hotter, a little more each day, until it seizes. A seized spindle bearing costs a rebuild, days of downtime, and possibly the part in the machine. The goal across the four lessons: **see it coming early enough to plan the repair**.

Nine weeks of readings come with the chapter. This lesson loads them, repairs a hole in them, and finds the patterns any forecast has to respect.

> **Time series**: a sequence of measurements of the same thing, taken in time order, usually at a regular spacing (every hour, every shift, every day). The order is part of the data: a reading's meaning depends on the readings before it, and shuffling the rows destroys information.
>
> *Picture it as* an SPC chart on the shop wall. The points are only useful in order: a run of seven rising points means something, but the same seven values in random order mean nothing.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `spindle-watch`.
2. `python -m venv .venv`
3. `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import sklearn, numpy, pytest\"" label="NumPy, scikit-learn and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/spindle.csv`, which starts like this:

```text
time,temperature
2026-01-05T00:00,20.1
2026-01-05T01:00,19.2
```

The `time` column is written in **ISO 8601** format: year-month-day, a `T`, then hours:minutes. It's the international standard way of writing a date and time as text. It sorts correctly as plain text and can't be misread the way 05/01 can (5 January or 1 May?).

```python file=tests/test_readings.py provided
# Tests for readings.py and cycles.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_readings.py
from datetime import datetime, timedelta

import numpy as np
import pytest
from pytest import approx

FOUR = [datetime(2026, 1, 5, hour) for hour in (0, 1, 4, 5)]


def test_load_reads_times_and_temperatures():
    import readings
    times, values = readings.load("data/spindle.csv")
    assert len(times) == 1509 and values.shape == (1509,)
    assert times[0] == datetime(2026, 1, 5, 0, 0) and values[0] == 20.1


def test_load_refuses_readings_out_of_order(tmp_path):
    import readings
    path = tmp_path / "readings.csv"
    path.write_text("time,temperature\n2026-01-05T01:00,20.0\n2026-01-05T00:00,21.0\n", encoding="utf-8")
    with pytest.raises(readings.ReadingError) as refused:
        readings.load(str(path))
    assert str(refused.value) == "line 3: 2026-01-05 00:00:00 is not after 2026-01-05 01:00:00"


def test_gaps_names_the_reading_before_and_how_many_hours_are_missing():
    import readings
    assert readings.gaps(FOUR) == [(datetime(2026, 1, 5, 1), 2)]
    assert readings.gaps(FOUR[2:]) == []


def test_the_spindle_file_has_one_gap_of_three_hours():
    import readings
    times, _ = readings.load("data/spindle.csv")
    assert readings.gaps(times) == [(datetime(2026, 1, 24, 9), 3)]


def test_fill_puts_missing_hours_on_a_straight_line():
    import readings
    times, values = readings.fill(FOUR, np.array([10.0, 11.0, 20.0, 21.0]))
    assert times == [datetime(2026, 1, 5, hour) for hour in range(6)]
    assert values == approx([10, 11, 14, 17, 20, 21])


def test_trailing_mean_uses_only_the_past():
    import cycles
    means = cycles.trailing_mean(np.array([1.0, 2.0, 3.0, 10.0]), 3)
    assert np.isnan(means[:2]).all()
    assert means[2:] == approx([2, 5])


def test_hourly_profile_keeps_weekdays_and_weekends_apart():
    import cycles
    times = [datetime(2026, 1, 5) + timedelta(hours=h) for h in range(14 * 24)]
    values = np.array([when.hour + (100.0 if when.weekday() >= 5 else 0.0) for when in times])
    assert cycles.hourly_profile(times, values, weekdays=True) == approx(list(range(24)))
    assert cycles.hourly_profile(times, values, weekdays=False) == approx([hour + 100 for hour in range(24)])
```

- **`datetime(2026, 1, 5, hour)`** makes a date and time: 5 January 2026 at that hour. `FOUR` is four hourly readings with two hours missing between 01:00 and 04:00.
- **`tmp_path`** is a pytest fixture (lesson 0.5): a fresh, empty folder for each test, so the out-of-order file never touches your real data.
- **The last test** builds two weeks of made-up readings where every weekend reading is 100 higher, so a profile that mixes weekdays and weekends can't pass.

```check
file tests/test_readings.py -- Click "Create provided tests/test_readings.py" above.
file data/spindle.csv
```

## Load the readings

Python's **`datetime`** module (part of the standard library, no install) handles dates and times. Two of its types matter here:

> **`datetime`**: one moment, such as 2026-01-05 06:00. **`timedelta`**: a length of time, such as 3 hours. Subtracting two `datetime`s gives a `timedelta`; adding a `timedelta` to a `datetime` gives a later `datetime`; dividing one `timedelta` by another gives a plain number.
>
> *Picture it as* the difference between a clock reading and a stopwatch reading. 06:00 is a moment; "three hours" is a length you can add to a moment or measure between two of them.

Create `readings.py`:

```python file=readings.py
import csv
from datetime import datetime, timedelta

import numpy as np

HOUR = timedelta(hours=1)


class ReadingError(ValueError):
    """The readings can't be used, and the message says why."""


def load(path: str) -> tuple[list[datetime], np.ndarray]:
    """The times and temperatures in a readings file, oldest first."""
    times, values = [], []
    with open(path, newline="", encoding="utf-8") as file:
        for number, row in enumerate(csv.DictReader(file), start=2):
            when = datetime.fromisoformat(row["time"])
            if times and when <= times[-1]:
                raise ReadingError(f"line {number}: {when} is not after {times[-1]}")
            times.append(when)
            values.append(float(row["temperature"]))
    return times, np.array(values)
```

- **`HOUR = timedelta(hours=1)`**: a constant for one hour, used from the next step on.
- **`datetime.fromisoformat(row["time"])`** turns the text `2026-01-05T06:00` into a `datetime`.
- **`if times and when <= times[-1]`**: `times` is empty for the first row, so there's nothing to compare yet; after that, each reading must be later than the one before (`times[-1]` is the last item in the list). A file that goes back in time was sorted wrongly, or two logs were pasted together, and every calculation after this one would be quietly wrong.
- **`enumerate(..., start=2)`** numbers the rows from 2, because line 1 is the header: the error then names the line you'd look at in an editor, the same idea as lesson 15.1's `data.py`.
- **`f"{when}"`** prints a `datetime` as `2026-01-05 00:00:00`, which is what the test expects.

```check
run ".venv/Scripts/python -m pytest -q tests/test_readings.py -k load" label="1,509 readings load in time order, and an out-of-order file is refused with the line number" -- when = datetime.fromisoformat(row["time"]); refuse it if when <= times[-1]
```

## Finding the gaps

Nine weeks is 63 × 24 = 1,512 hours, but the file has 1,509 readings. Three hours are missing. Logging gaps are normal (a network drop, a controller reboot, a full disk), and they matter more here than in a table of houses: much of what comes later says "the reading 24 hours earlier", and with a gap, row 24 places back is no longer 24 hours back.

> **A regular time series** has exactly one reading per time step, with none missing. Most time-series methods assume it, because they find "the reading a day ago" by counting rows.

Two jobs: **find** the gaps (so they can be reported, not silently papered over) and **fill** them, so every hour has a reading. Filling with **linear interpolation** means drawing a straight line from the reading before the gap to the reading after it, and reading the missing hours off the line. For `FOUR`, with values 11 at 01:00 and 20 at 04:00, the line rises 9 over 3 hours, so 02:00 gets 14 and 03:00 gets 17.

Add the two functions to the end of `readings.py`:

```python file=readings.py
import csv
from datetime import datetime, timedelta

import numpy as np

HOUR = timedelta(hours=1)


class ReadingError(ValueError):
    """The readings can't be used, and the message says why."""


def load(path: str) -> tuple[list[datetime], np.ndarray]:
    """The times and temperatures in a readings file, oldest first."""
    times, values = [], []
    with open(path, newline="", encoding="utf-8") as file:
        for number, row in enumerate(csv.DictReader(file), start=2):
            when = datetime.fromisoformat(row["time"])
            if times and when <= times[-1]:
                raise ReadingError(f"line {number}: {when} is not after {times[-1]}")
            times.append(when)
            values.append(float(row["temperature"]))
    return times, np.array(values)


def gaps(times: list[datetime]) -> list[tuple[datetime, int]]:
    """(the reading before each gap, how many hours are missing after it)."""
    found = []
    for before, after in zip(times, times[1:]):
        missing = round((after - before) / HOUR) - 1
        if missing > 0:
            found.append((before, missing))
    return found


def fill(times: list[datetime], values: np.ndarray) -> tuple[list[datetime], np.ndarray]:
    """Every hour from the first reading to the last, missing hours on a straight line between their neighbours."""
    offsets = [(when - times[0]) / HOUR for when in times]
    every = np.arange(offsets[-1] + 1)
    return [times[0] + hours * HOUR for hours in range(len(every))], np.interp(every, offsets, values)
```

**`gaps`:**

- **`zip(times, times[1:])`** pairs each reading with the next one: `times[1:]` is the same list starting one later, so the pairs are (1st, 2nd), (2nd, 3rd), and so on.
- **`(after - before) / HOUR`** is how many hours apart they are, as a number. One hour apart means none missing, so subtract 1. **`round`** guards against a timestamp a few seconds off making it 2.9999.

**`fill`:**

- **`offsets`** turns every time into "hours since the first reading": for `FOUR`, `[0, 1, 4, 5]`.
- **`every = np.arange(offsets[-1] + 1)`** is every hour that should exist: `[0, 1, 2, 3, 4, 5]`.
- **`np.interp(every, offsets, values)`** is NumPy's linear interpolation: for each hour in `every`, it finds where it falls among the known `offsets` and reads the value off the straight line between the neighbours. Hours that already have a reading get it back unchanged.

```check
run ".venv/Scripts/python -m pytest -q tests/test_readings.py -k \"gap or fill\"" label="the 3-hour gap on 24 January is found, and fill draws a straight line across it" -- gaps: missing = round((after - before) / HOUR) - 1; fill: np.interp(every, offsets, values)
```

**Where filling stops being safe:** a straight line across three hours of a slowly changing temperature is a reasonable guess. Across three days it would be invented data, and a model trained on it learns your guess, not the machine. A good rule is to fill short gaps, report long ones, and never fill the thing you're trying to predict.

## Smoothing without seeing the future

Hour-to-hour readings are noisy: the sensor wobbles by a few tenths of a degree. To see a slow change (like a bearing getting hotter week by week) you average the noise away with a **moving average**: the mean of a fixed number of consecutive readings, recomputed at each step.

> **A trailing moving average** at hour *t* is the mean of the readings from *t* − (window − 1) up to *t*: only the present and the past. A **centred** moving average uses readings on both sides of *t*. Centred looks nicer on a chart, but at hour *t* it uses readings from *after* hour *t*, which you won't have when you need the number.

That distinction is the time-series version of lesson 7.4's leakage: any feature built for hour *t* must use only what was known at hour *t*. The trailing average is the safe one. On `[1, 2, 3, 10]` with a window of 3, the first two hours don't have three readings yet (so `nan`, "not a number"), then (1 + 2 + 3) / 3 = 2 and (2 + 3 + 10) / 3 = 5.

The other thing to look for is a repeating **cycle**: a pattern that comes back at the same point every day or every week. To see it, average all the readings taken at the same hour of the day. Create `cycles.py`:

```python file=cycles.py
from datetime import datetime

import numpy as np


def trailing_mean(values: np.ndarray, window: int) -> np.ndarray:
    """The mean of each reading and the window - 1 readings before it; nan until there are enough."""
    means = np.full(len(values), np.nan)
    for i in range(window - 1, len(values)):
        means[i] = values[i - window + 1 : i + 1].mean()
    return means


def hourly_profile(times: list[datetime], values: np.ndarray, weekdays: bool) -> np.ndarray:
    """The average reading at each hour of the day, over weekdays (or over weekends)."""
    profile = np.zeros(24)
    for hour in range(24):
        chosen = [value for when, value in zip(times, values) if when.hour == hour and (when.weekday() < 5) == weekdays]
        profile[hour] = np.mean(chosen)
    return profile
```

- **`np.full(len(values), np.nan)`** starts with an array of `nan`s, and the loop fills in every hour that has a full window behind it.
- **`values[i - window + 1 : i + 1]`**: a slice stops *before* its end index, so `i + 1` makes it include hour `i` itself. With window 3 and `i = 2`, that's `values[0:3]`: hours 0, 1 and 2.
- **`when.weekday()`** is 0 for Monday up to 6 for Sunday, so **`< 5`** means Monday to Friday. **`(when.weekday() < 5) == weekdays`** keeps a reading when its kind of day matches the one asked for.
- **`when.hour`** is the hour of the day, 0 to 23.

```check
run ".venv/Scripts/python -m pytest -q tests/test_readings.py -k \"trailing or profile\"" label="the trailing mean uses only the past, and the hourly profile keeps weekdays and weekends apart" -- means[i] = values[i - window + 1 : i + 1].mean(); keep a reading when when.hour == hour and (when.weekday() < 5) == weekdays
```

## The cycles in the numbers

Create `look.py`:

```python file=look.py
import cycles
import readings

times, values = readings.fill(*readings.load("data/spindle.csv"))

weekday = cycles.hourly_profile(times, values, weekdays=True)
weekend = cycles.hourly_profile(times, values, weekdays=False)
print("hour   weekday  weekend   (average °C)")
for hour in range(0, 24, 2):
    print(f"{hour:02d}:00 {weekday[hour]:8.1f} {weekend[hour]:8.1f}")

weekly = cycles.trailing_mean(values, 168)
print("\nweek   average of its 168 hours")
for week in range(1, 10):
    print(f"{week:4d} {weekly[week * 168 - 1]:9.1f}")
```

- **`readings.fill(*readings.load(...))`**: `load` returns two things, `(times, values)`, and the **`*`** unpacks them into `fill`'s two arguments. It's the same as `times, values = readings.load(...)` followed by `readings.fill(times, values)`.
- **`f"{hour:02d}"`** pads the hour with a leading zero to two digits: `06`.
- **168** is the number of hours in a week, so `weekly[week * 168 - 1]`, the trailing mean at a week's last hour, is that week's average.

```powershell
.venv\Scripts\python look.py
```

```text
hour   weekday  weekend   (average °C)
00:00     21.8     20.9
02:00     19.2     19.1
04:00     18.2     18.4
06:00     27.3     18.5
08:00     35.8     19.4
10:00     39.2     20.2
12:00     41.1     21.5
14:00     42.1     22.5
16:00     42.7     22.9
18:00     42.4     22.5
20:00     41.7     21.8
22:00     31.4     20.5

week   average of its 168 hours
   1      29.0
   2      28.9
   3      29.1
   4      29.0
   5      29.1
   6      29.2
   7      29.6
   8      31.3
   9      33.8
```

Three patterns are there, and every forecast in this chapter has to deal with each:

- **A daily cycle.** On weekdays, the shop runs two shifts from 06:00 to 22:00. The bearing warms from about 18 °C to over 40 °C within a few hours of start-up, then cools overnight. Even at weekends there's a small cycle of about 4 °C, which is the shop's own temperature following the day.
- **A weekly cycle.** Saturday and Sunday don't run at all, so they look nothing like a weekday. "The same hour yesterday" is a poor guide on a Monday morning or a Saturday afternoon.
- **A trend.** For six weeks the weekly average sits at 29 °C, give or take 0.1. Then it creeps up: 29.6, 31.3, 33.8. That's the bearing starting to fail, and it's what the chapter is about.

> **Seasonality**: a pattern that repeats with a fixed period (daily, weekly, yearly). **Trend**: a slow, lasting change in the level. A time series is often thought of as trend + seasonality + noise.
>
> *Picture it as* a part's diameter coming off a lathe. It wobbles part to part (noise), drifts with the shop's temperature through each day (seasonality), and slowly grows as the insert wears (trend).

```check
run ".venv/Scripts/python look.py" stdout="   9      33.8" label="look.py shows the daily and weekly cycles, and a rising trend in weeks 7 to 9"
```

```predict
question: The data has two shifts on weekdays and nothing at weekends. What would the weekly averages have shown if you'd used a centred 168-hour average instead of a trailing one?
choice: Exactly the same numbers
choice: Each week's number would mix in readings from the following week, so the rise would show up earlier than it really happened
choice: The cycles would disappear
answer: Each week's number would mix in readings from the following week, so the rise would show up earlier than it really happened
explain: A centred average at the end of week 7 spans half of week 7 and half of week 8, so part of week 8's heat appears in week 7's number. On a chart drawn after the fact that's harmless. In a system that raises an alarm, it means the alarm "sees" heat that hasn't happened yet in testing, and then can't see it in real use. Every number you'll use for forecasting must be trailing.
```

## Your own machine

The same four steps apply to any logged signal: spindle load, axis following error, coolant concentration, the time between parts.

1. **Export it with a timestamp on every reading**, in ISO 8601 if you have the choice. If your controller or historian exports local time, check what happens at daylight-saving changes: one hour appears twice in the autumn, and one is missing in the spring.
2. **Check the order and the gaps before anything else**, as `load` and `gaps` do. Write down how many gaps there are and how long they are.
3. **Fill only short gaps.** Decide in advance what "short" means for your signal (for a slow temperature, a few hours; for vibration, a few seconds).
4. **Print the hourly profile and a trailing weekly average.** Find your shifts, your weekends and any trend before you try to predict anything.
