---
title: 17.2 — Tomorrow Looks Like Today: Baselines That Respect Time
track: Time Series — Spindle Bearing Watch
runtime: none
concepts: time-series
revisits: regression-metrics, generalization, cross-validation, numpy, exceptions, testing
notebook: ml-time-series
lab: 19
problem: Before any model, the honest question: how well can you forecast the bearing temperature 8 hours ahead by copying an earlier reading? And how do you test a forecast fairly, when the future must never leak into the past?
---

The maintenance planner wants a forecast **one shift ahead**: at any hour, what will the bearing temperature be 8 hours from now? That gives the shift lead time to slow the spindle or book the repair before it gets too hot.

As in every chapter since lesson 8.5: before any model, find the number to beat. For time series, the simplest forecasts are surprisingly hard to beat, and a forecast that can't beat them isn't worth running.

## Two words: horizon and backtest

> **Forecast horizon**: how far ahead a forecast looks. Here it's 8 hours. A forecast made at 06:00 with an 8-hour horizon is for 14:00, and may use only readings up to 06:00.
>
> *Picture it as* ordering material: you have to place the order with the information you have on the day you order, not the information you'll have when it arrives.

> **Backtest**: testing a forecast method on past data by pretending to stand at an earlier time, forecasting from what was known then, and comparing with what really happened. Every test in this chapter is a backtest, and the one rule is that **training always comes before testing in time**.

Lesson 7.3's shuffled cross-validation breaks that rule. It would train on week 9 and test on week 5, so the model would have already "seen" the bearing wearing out. Here, the test period is always the **last** stretch of time: weeks 5 to 9.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_forecast.py provided
# Tests for forecast.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_forecast.py
import numpy as np
import pytest
from pytest import approx


def test_copy_back_forecasts_each_reading_as_an_earlier_one():
    import forecast
    forecasts = forecast.copy_back(np.array([1.0, 2.0, 3.0, 4.0, 5.0]), lag=2, horizon=1)
    assert np.isnan(forecasts[:2]).all()
    assert forecasts[2:] == approx([1, 2, 3])


def test_copy_back_refuses_a_reading_that_is_not_known_yet():
    import forecast
    with pytest.raises(ValueError) as refused:
        forecast.copy_back(np.arange(10.0), lag=4, horizon=8)
    assert str(refused.value) == "lag 4 is shorter than the horizon 8: that reading isn't known yet"


def test_mae_is_the_average_size_of_the_misses():
    import forecast
    assert forecast.mae(np.array([1.0, 2.0, 3.0]), np.array([2.0, 2.0, 1.0])) == approx(1.0)
```

- **`lag=2`** means "forecast each reading as the one 2 places earlier". The first two readings have nothing 2 places before them, so their forecasts are `nan`.
- **The second test** is the time-series leakage rule written as a test: forecasting 8 hours ahead with the reading from 4 hours before means using a reading that, at forecast time, is still 4 hours in the future.

```check
file tests/test_forecast.py -- Click "Create provided tests/test_forecast.py" above.
```

## Forecasting by copying

> **Lag**: how far back a past reading is from the one being forecast. "The reading 24 hours earlier" is lag 24. A **lagged copy** of a series is the series shifted later by that many steps.
>
> *Picture it as* a conveyor with a gauge on it: the part passing the gauge now is the one that was loaded 24 stations ago.

The three obvious baselines are all lagged copies, with different lags:

| baseline | lag | the idea |
|---|---|---|
| **persistence**: the reading 8 hours ago | 8 | nothing changes |
| **seasonal**: the same hour yesterday | 24 | today repeats yesterday |
| **seasonal**: the same hour last week | 168 | this week repeats last week |

A lag can't be shorter than the horizon: at 06:00, forecasting 14:00, the newest reading you have is 06:00's, which is lag 8. So 8 is the shortest lag allowed.

To measure the forecasts, use the **mean absolute error** (lesson 3.4): the average of the misses' sizes, ignoring their sign. It's in °C, the units the planner thinks in.

Create `forecast.py`:

```python file=forecast.py
import numpy as np


def copy_back(values: np.ndarray, lag: int, horizon: int) -> np.ndarray:
    """Forecast each reading as the one `lag` hours before it; nan where there isn't one yet."""
    if lag < horizon:
        raise ValueError(f"lag {lag} is shorter than the horizon {horizon}: that reading isn't known yet")
    forecasts = np.full(len(values), np.nan)
    forecasts[lag:] = values[:-lag]
    return forecasts


def mae(actual: np.ndarray, forecasts: np.ndarray) -> float:
    """Mean absolute error: the typical size of a miss, in the readings' own units."""
    return float(np.mean(np.abs(actual - forecasts)))
```

- **`forecasts[lag:] = values[:-lag]`** is the whole forecast. `values[:-lag]` is every reading except the last `lag` of them; it's written into `forecasts` starting `lag` places later. With `lag=2` on `[1, 2, 3, 4, 5]`: `values[:-2]` is `[1, 2, 3]`, which goes into `forecasts[2:]`, giving `[nan, nan, 1, 2, 3]`.
- **`np.abs(actual - forecasts)`** is each miss's size; the mean of those is the MAE.

```check
run ".venv/Scripts/python -m pytest -q tests/test_forecast.py" label="copy_back shifts by the lag and refuses a lag shorter than the horizon; mae averages the misses" -- forecasts[lag:] = values[:-lag]; raise ValueError when lag < horizon
```

## The number to beat

Create `baselines.py`. It backtests all three baselines on weeks 5 to 9, then looks at the best one week by week:

```python file=baselines.py
import forecast
import readings

HORIZON = 8
WEEK = 168
times, values = readings.fill(*readings.load("data/spindle.csv"))
test = slice(4 * WEEK, None)

print(f"forecasting {HORIZON} hours ahead, over weeks 5 to 9")
print("baseline                   typical error (°C)")
for name, lag in [("the reading 8 hours ago", 8), ("the same hour yesterday", 24), ("the same hour last week", WEEK)]:
    forecasts = forecast.copy_back(values, lag, HORIZON)
    print(f"{name:<27}{forecast.mae(values[test], forecasts[test]):6.2f}")

last_week = forecast.copy_back(values, WEEK, HORIZON)
print("\n'the same hour last week', week by week")
for week in range(5, 10):
    hours = slice((week - 1) * WEEK, week * WEEK)
    print(f"week {week}  {forecast.mae(values[hours], last_week[hours]):5.2f}")
```

- **`slice(4 * WEEK, None)`** is a slice kept in a variable: `values[test]` means the same as `values[672:]`, everything from the start of week 5. Naming it once means every baseline is measured on exactly the same hours.
- **`(week - 1) * WEEK`** is the first hour of a week, counting weeks from 1.

```powershell
.venv\Scripts\python baselines.py
```

```text
forecasting 8 hours ahead, over weeks 5 to 9
baseline                   typical error (°C)
the reading 8 hours ago     11.20
the same hour yesterday      4.35
the same hour last week      1.15

'the same hour last week', week by week
week 5   0.45
week 6   0.47
week 7   0.66
week 8   1.71
week 9   2.44
```

Three lessons are in those numbers:

- **Persistence is terrible here** (11.2 °C), because 8 hours spans a start-up or a shut-down: at 06:00 the bearing is cold, at 14:00 it's hot.
- **Yesterday is much better, but 4.35 °C is still poor**, because of the weekly cycle: on a Monday it copies Sunday (cold) for a running shift, and on a Saturday it copies Friday (hot) for a stopped machine.
- **Last week is excellent** while nothing is changing: under half a degree in weeks 5 and 6. Then its error grows to 1.71 and 2.44. It copies a week when the bearing was healthier, so it is always one week behind the wear, and gets worse as the wear speeds up.

So the number to beat is **1.15 °C** overall. The week-by-week figures show the real weakness, though: the baseline is worst in exactly the weeks that matter, when the bearing is failing.

```check
run ".venv/Scripts/python baselines.py" stdout="the same hour last week      1.15" label="baselines.py: the same hour last week is the best baseline at 1.15 °C"
run ".venv/Scripts/python baselines.py" stdout="week 9   2.44" label="and its error grows as the bearing wears"
```

```predict
question: 'The same hour yesterday' averages 4.35 °C of error. On which days would you expect almost all of that error to come from?
choice: Spread evenly over every day
choice: Mondays and Saturdays, where yesterday was a different kind of day
choice: Only week 9, when the bearing is hottest
answer: Mondays and Saturdays, where yesterday was a different kind of day
explain: On Tuesday to Friday and on Sunday, yesterday was the same kind of day, and its error is about 0.6 °C. On Mondays and Saturdays it's over 13 °C, because a cold day is copied for a running one or the other way round. Two bad days out of seven produce nearly all of the 4.35. A single average hides this, which is why it's worth breaking an error down by the things you know matter: day of the week, shift, machine, product.
```

## Your own machine

1. **Choose the horizon from the decision**, not from the data: how much warning does the person acting on the forecast need? One shift, one day, one week?
2. **Try the three lagged copies**: persistence, the same time yesterday, and the same time last week (and the same day last year, if you have years of data). The best of them is your number to beat.
3. **Break the baseline's error down** by week, weekday and shift. Where the baseline does badly is where a model has room to help.
4. **Keep the test period at the end** of your data, always.
