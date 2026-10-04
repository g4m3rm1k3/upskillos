---
title: 17.3 — Learning From the Past: Lag Features and Walk-Forward Testing
track: Time Series — Spindle Bearing Watch
runtime: none
concepts: time-series
revisits: cross-validation, linear-regression, ensembles, scikit-learn, generalization, feature-scaling, testing
notebook: ml-time-series
lab: 19
problem: Every model in this series learned from a table of features. A time series is a single column. How do you turn one column of readings into a table a regression can learn from, without letting the future in? And why does the model that wins a shuffled test lose when the bearing starts to fail?
---

Lesson 17.2's best baseline copies last week, and falls behind as soon as the bearing starts wearing. A model could combine several clues at once: last week's reading, but also how warm things are *right now* compared with a week ago, whether the shift will be running, and the time of day. This lesson builds that model, and uses it to learn the two lessons every time-series project learns the hard way.

## Turning a column into a table

> **Lag features**: columns built from the series' own past, one row per hour to be forecast. For the hour being forecast, a row holds things like "the reading at the latest hour we know", "the reading 24 hours earlier" and "the reading 168 hours earlier". The target is the reading itself. With lag features, forecasting becomes ordinary regression (lesson 3.4).
>
> *Picture it as* a setter's notebook. To guess how this afternoon's run will go, they look at this morning's run, the same job yesterday, and the same job last week, and weigh them up.

The **features** for hour *i*, forecast 8 hours ahead from hour *i* − 8:

| feature | which readings | why |
|---|---|---|
| last known | *i* − 8 | how warm it is now |
| same hour yesterday | *i* − 24 | the daily cycle |
| same hour last week | *i* − 168 | the weekly cycle |
| last 24 known hours | the mean of *i* − 31 to *i* − 8 | the recent level, with the noise averaged out (lesson 17.1's trailing mean) |
| running | the shift schedule at hour *i* | will the spindle be running? |
| hour sin, hour cos | the hour of day at *i* | where in the day it is |

**Running** is about the future hour, and that's allowed, because it comes from the **schedule**, which is known in advance. The test is never "is it about the future?" but "would I *know* it at forecast time?". The shift pattern, yes; the temperature, no.

**Why sine and cosine for the hour?** As a plain number, the hour of day puts 23:00 and 00:00 as far apart as possible (23 against 0), but they're one hour apart. Placing the hour around a circle, as an angle $2\pi \times \text{hour} / 24$, and using the angle's sine and cosine (the two coordinates of that point on a circle of radius 1) gives two numbers that wrap round smoothly: 23:00 and 00:00 end up next to each other.

Rows start at hour 168, the first hour that has a reading a full week earlier.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_features.py provided
# Tests for features.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_features.py
from datetime import datetime, timedelta

import numpy as np
from pytest import approx

TIMES = [datetime(2026, 1, 5) + timedelta(hours=h) for h in range(400)]
VALUES = np.arange(400.0)


def test_running_follows_the_shift_schedule():
    import features
    assert features.running(datetime(2026, 1, 5, 6)) == 1.0       # Monday 06:00
    assert features.running(datetime(2026, 1, 5, 21)) == 1.0
    assert features.running(datetime(2026, 1, 5, 22)) == 0.0
    assert features.running(datetime(2026, 1, 10, 12)) == 0.0     # Saturday


def test_make_builds_one_row_per_hour_from_the_second_week():
    import features
    X, y, kept = features.make(TIMES, VALUES, horizon=8)
    assert X.shape == (232, 7) and kept[0] == 168 and y[0] == 168
    assert X[0, :5] == approx([160, 144, 0, 148.5, 0.0])


def test_make_uses_nothing_newer_than_the_horizon():
    import features
    X, _, _ = features.make(TIMES, VALUES, horizon=8)
    later = VALUES.copy()
    later[161:169] = 999.0                                         # the 8 hours before row 0's target
    X_later, _, _ = features.make(TIMES, later, horizon=8)
    assert X_later[0] == approx(X[0])
```

- **`VALUES = np.arange(400.0)`** makes each reading equal to its own hour number (0, 1, 2, …), so you can check every feature by reading its value. Row 0 forecasts hour 168: the last known hour is 160, yesterday is 144, last week is 0, and the mean of hours 137 to 160 is 148.5. Hour 168 is Monday 00:00, so `running` is 0.
- **The last test is a leakage test.** It changes the 8 readings the forecast mustn't know about (hours 161 to 168) to 999, and checks that row 0's features don't change at all. If any feature reached past the horizon, the 999s would show up in it.

```check
file tests/test_features.py -- Click "Create provided tests/test_features.py" above.
```

## The features

Create `features.py`:

```python file=features.py
from datetime import datetime

import numpy as np

NAMES = ["last known", "same hour yesterday", "same hour last week", "last 24 known hours", "running", "hour sin", "hour cos"]


def running(when: datetime) -> float:
    """1 in the scheduled shifts (weekdays, 06:00 to 22:00), else 0: known in advance from the schedule."""
    return 1.0 if when.weekday() < 5 and 6 <= when.hour < 22 else 0.0


def make(times: list[datetime], values: np.ndarray, horizon: int) -> tuple[np.ndarray, np.ndarray, list[int]]:
    """One row of features per hour from the second week on, using only readings `horizon` hours old or older."""
    rows, targets, kept = [], [], []
    for i in range(168, len(values)):
        known = i - horizon
        angle = 2 * np.pi * times[i].hour / 24
        rows.append([values[known], values[i - 24], values[i - 168], values[known - 23 : known + 1].mean(),
                     running(times[i]), np.sin(angle), np.cos(angle)])
        targets.append(values[i])
        kept.append(i)
    return np.array(rows), np.array(targets), kept
```

- **`6 <= when.hour < 22`** is a chained comparison: true when the hour is at least 6 and less than 22, so 06:00 to 21:59.
- **`known = i - horizon`** is the newest hour you'd have at forecast time. Everything else is built from `known` or from even older hours.
- **`values[known - 23 : known + 1]`** is the 24 readings ending at `known` (the same slice as lesson 17.1's trailing mean).
- **`kept`** records which hour each row forecasts, so later scripts can split the rows by date.

```check
run ".venv/Scripts/python -m pytest -q tests/test_features.py" label="one row per hour from the second week, built only from readings at least 8 hours old" -- known = i - horizon; every feature uses values[known], values[i - 24], values[i - 168] or values[known - 23 : known + 1]
```

## Shuffled folds lie about time

Now compare two models with two kinds of cross-validation. The first is lesson 7.3's shuffled `KFold`. The second is scikit-learn's **`TimeSeriesSplit`**:

> **Walk-forward validation** (scikit-learn's `TimeSeriesSplit`): the data is cut into consecutive blocks in time order. The first fold trains on block 1 and tests on block 2; the next trains on blocks 1–2 and tests on block 3; and so on. Training data is always older than test data, as it would be in real use.
>
> *Picture it as* qualifying a new process the way it will really run: you set it up on what you know today, and judge it on parts you haven't made yet, never on parts already in the bin.

Create `validate.py`:

```python file=validate.py
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, TimeSeriesSplit, cross_val_score

import features
import readings

times, values = readings.fill(*readings.load("data/spindle.csv"))
X, y, kept = features.make(times, values, horizon=8)

models = {
    "linear regression": lambda: LinearRegression(),
    "random forest": lambda: RandomForestRegressor(n_estimators=100, random_state=0),
}
print("model               shuffled folds   walk-forward folds   (typical error, °C)")
for name, make in models.items():
    shuffled = cross_val_score(make(), X, y, cv=KFold(5, shuffle=True, random_state=0), scoring="neg_mean_absolute_error")
    forward = cross_val_score(make(), X, y, cv=TimeSeriesSplit(5), scoring="neg_mean_absolute_error")
    print(f"{name:<20}{-shuffled.mean():10.2f}{-forward.mean():18.2f}")
```

- **`scoring="neg_mean_absolute_error"`**: scikit-learn's scores are always "higher is better", so errors come back negated; the `-` in the `print` turns them back into positive °C.
- **`TimeSeriesSplit(5)`** makes 5 walk-forward folds, each testing on a later block than it trained on.

```powershell
.venv\Scripts\python validate.py
```

```text
model               shuffled folds   walk-forward folds   (typical error, °C)
linear regression         0.87              0.91
random forest             0.48              0.88
```

Shuffled folds say the forest is nearly **twice as good** as linear regression (0.48 against 0.87). Walk-forward folds say they're about the same. The difference is in what the forest can "see" when the rows are shuffled: an hour in the test fold almost always has the hour before it and the hour after it in the training fold, with nearly the same features and nearly the same temperature. Each tree in the forest predicts by sorting a row into a leaf of similar training rows (lessons 9.3 and 9.4), so in effect it looks up the neighbours. In real use there are no future neighbours to look up.

```check
run ".venv/Scripts/python validate.py" stdout="random forest             0.48              0.88" label="validate.py: shuffled folds flatter the forest; walk-forward folds don't"
```

## Train once, and the bearing gets away

Walk-forward cross-validation averages over the whole nine weeks, most of which are healthy. The real question is narrower: trained on the healthy weeks, how does each model do when the bearing starts to fail? Create `once.py`, which trains on weeks 2 to 6 and tests on weeks 7 to 9:

```python file=once.py
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression

import features
import forecast
import readings

WEEK = 168
times, values = readings.fill(*readings.load("data/spindle.csv"))
X, y, kept = features.make(times, values, horizon=8)
cut = kept.index(6 * WEEK)   # train on weeks 2 to 6, test on weeks 7 to 9

last_week = forecast.copy_back(values, WEEK, 8)[6 * WEEK:]
print(f"baseline (same hour last week)  {forecast.mae(y[cut:], last_week):5.2f}")
for name, model in [("linear regression", LinearRegression()),
                    ("random forest", RandomForestRegressor(n_estimators=100, random_state=0))]:
    forecasts = model.fit(X[:cut], y[:cut]).predict(X[cut:])
    print(f"{name:<31} {forecast.mae(y[cut:], forecasts):5.2f}   highest forecast {forecasts.max():.1f}")
print(f"highest reading in training {y[:cut].max():.1f}, in testing {y[cut:].max():.1f}")
```

- **`kept.index(6 * WEEK)`** finds the row that forecasts hour 1,008, the first hour of week 7. Rows before it train; rows from it on test. It's a **time split**: a single cut in time, the simplest backtest.
- **`[6 * WEEK:]`** keeps the baseline's forecasts for the same weeks, so all three are measured on identical hours.

```powershell
.venv\Scripts\python once.py
```

```text
baseline (same hour last week)   1.61
linear regression                1.59   highest forecast 45.9
random forest                    2.20   highest forecast 41.6
highest reading in training 42.1, in testing 50.5
```

Two things went wrong, and both are worth remembering:

- **Neither model beats the baseline by anything worth having.** Linear regression's weights turn out to be about 0.97 on "same hour last week" and close to 0 on everything else: in the healthy weeks it learned from, last week really was the best guide, so it learned to copy last week. A model can only learn the patterns its training data contains, and these five weeks contain no wear.
- **The forest is the worst of the three, and it can't go above 41.6 °C.** A regression tree predicts the average of the training targets in a row's leaf (9.3's trees vote for a class; regression trees average a number instead), so a forest can never predict a value higher than the hottest reading it trained on (42.1 °C). When the bearing heads for 50 °C, the forest keeps saying "about 41".

> **Extrapolation**: predicting outside the range of the training data. Linear models extrapolate (the line keeps going, for better or worse); tree models can't (they flatten at the edge of what they've seen). With a trend, the future is *always* outside the past's range.

```check
run ".venv/Scripts/python once.py" stdout="random forest                    2.20   highest forecast 41.6" label="once.py: trained once on healthy weeks, the forest can't forecast above what it saw"
```

## Retrain every night

The fix used in practice is simple: **retrain on schedule**. Every night at midnight, refit the model on everything recorded so far, and use it for the next day's forecasts. Each day the model has seen a little more of the wear. Create `nightly.py`:

```python file=nightly.py
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression

import features
import readings

times, values = readings.fill(*readings.load("data/spindle.csv"))
X, y, kept = features.make(times, values, horizon=8)
hour = np.array(kept)

for name, make in [("linear regression", LinearRegression),
                   ("random forest", lambda: RandomForestRegressor(n_estimators=100, random_state=0))]:
    misses = []
    for day in range(42, 63):                                     # every day of weeks 7 to 9
        known = hour < day * 24                                   # readings taken before midnight
        today = (hour >= day * 24) & (hour < (day + 1) * 24)
        model = make().fit(X[known], y[known])
        misses.extend(np.abs(model.predict(X[today]) - y[today]))
    print(f"{name:<20} retrained every night  {np.mean(misses):5.2f}")
```

- **`hour = np.array(kept)`** makes the forecast hours an array, so `hour < day * 24` compares every row at once and gives an array of `True`/`False` (lesson 1.3's boolean masks).
- **`known`** selects the rows whose target was measured before midnight on `day`; **`today`** selects the rows to forecast during `day`. A new model is fitted on `known` each night.
- **`misses.extend(...)`** adds all of today's miss sizes to one list; the mean at the end is the MAE over the three weeks.
- **`make`** is the class itself for linear regression (calling `LinearRegression()` makes one), and a `lambda` for the forest, so that both make a fresh model when called (lesson 7.3's `make_model` idea).

```powershell
.venv\Scripts\python nightly.py
```

```text
linear regression    retrained every night   1.34
random forest        retrained every night   0.85
```

Retrained nightly, the forest's error over the failing weeks drops from 2.20 to **0.85 °C**, about half of the baseline's 1.61. Each night it gets the newest, hottest hours in its training data, so the ceiling on its forecasts rises with the bearing. Its forecasts still lag a little behind the wear (it can only reach a temperature once it has seen it), and the next lesson deals with that.

```check
run ".venv/Scripts/python nightly.py" stdout="random forest        retrained every night   0.85" label="nightly.py: retrained every night, the forest halves the baseline's error"
```

```predict
question: A colleague proposes training once on a full year of healthy data and leaving the model running for another year. What's the risk?
choice: None: a year of data is plenty
choice: The model has never seen the machine change, so when something drifts (wear, a new coolant, a rebuilt spindle) it keeps forecasting the old normal, and the error grows without anyone noticing
choice: The model will be too slow to run
answer: The model has never seen the machine change, so when something drifts (wear, a new coolant, a rebuilt spindle) it keeps forecasting the old normal, and the error grows without anyone noticing
explain: A forecasting model describes the machine as it was during training. Machines change: wear, maintenance, new programs, new materials. Retraining on schedule, and logging every forecast's error so you notice when it grows (lesson 15.5's monitoring), are the two habits that keep a forecast honest.
```

## Your own machine

1. **Build lag features** at your horizon: the latest known value, the same time one cycle ago (a day, a week), and a trailing mean. Add what you know in advance: the schedule, the planned job, the shift.
2. **Write the leakage test** from `test_features.py` for your features: change the readings inside the horizon and check that no feature changes.
3. **Validate walk-forward only.** If shuffled folds are much better than walk-forward ones, your model is looking up neighbours.
4. **Backtest with nightly (or weekly) retraining**, because that's how it will run. Compare with your baseline over the most recent weeks, not just the average.
