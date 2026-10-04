---
title: 16.3 — The Advisor as a Service: Knowing What It Doesn't Know
track: Capstone — Your Own ML Product
runtime: none
concepts: ml-testing
revisits: web-api, linear-regression, mathematical-functions, model-persistence, deployment, testing
notebook: ml-capstone
lab: 33
problem: The cell lead doesn't want a tool-life number; they want to know what speed to run at. And a model fitted on speeds from 120 to 320 m/min will happily answer for 400. How do you turn the model round to answer the real question, and make it say when it's guessing?
---

The brief said what the cell lead actually decides: **the cutting speed**. A tool-life prediction is a step towards that, not the answer. The advisor should take "I want this insert to last 300 minutes, at this feed and depth, in this material" and answer "run at 241 m/min".

Because the model is an equation, not a black box, it can be solved for speed. And because it's an equation fitted on a limited range of tests, it must say when an answer lies outside that range.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_advisor.py provided
# Tests for the advisor's model additions and its API. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_advisor.py
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from pytest import approx

from advisor import data

X, LIFE = data.load(Path("data/tool_life.csv").read_text())
CUT = {"speed": 200, "feed": 0.2, "depth": 1.5, "hardness": 220, "coolant": "yes"}
TARGET = {"life": 300, "feed": 0.2, "depth": 1.5, "hardness": 220, "coolant": "yes"}


@pytest.fixture
def client():
    from advisor import api, model
    return TestClient(api.create_app(model.ToolLife().fit(X, LIFE)))


def test_the_model_remembers_its_tested_ranges():
    from advisor import model
    fitted = model.ToolLife().fit(X, LIFE)
    assert fitted.ranges_["speed"] == (121, 319) and fitted.ranges_["feed"] == (0.1, 0.4)
    assert fitted.tested([200, 0.2, 1.5, 220]) and not fitted.tested([400, 0.2, 1.5, 220])


def test_speed_for_is_the_equation_solved_round_trip():
    from advisor import model
    fitted = model.ToolLife().fit(X, LIFE)
    speed = fitted.speed_for(300, 0.2, 1.5, 220, 0.0)
    assert fitted.predict(np.array([[speed, 0.2, 1.5, 220, 0.0]]))[0] == approx(300)


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_life_for_a_planned_cut(client):
    assert client.post("/life", json=CUT).json() == {"tool_life_minutes": 545.3, "within_tested_range": True}
    fast = client.post("/life", json={**CUT, "speed": 400}).json()
    assert fast["tool_life_minutes"] < 100 and fast["within_tested_range"] is False


def test_speed_for_a_wanted_life(client):
    assert client.post("/speed", json=TARGET).json() == {"speed": 241, "within_tested_range": True}
    assert client.post("/speed", json={**TARGET, "coolant": "no"}).json()["speed"] == 222
    assert client.post("/speed", json={**TARGET, "life": 60}).json() == {"speed": 397, "within_tested_range": False}


def test_bad_requests_are_refused_with_a_reason(client):
    refused = client.post("/life", json={**CUT, "coolant": "maybe"})
    assert refused.status_code == 422 and "coolant" in refused.json()["detail"]
    assert client.post("/speed", json={**TARGET, "life": 0}).status_code == 422
    assert client.post("/speed", json={**TARGET, "feed": 5}).status_code == 422


def test_the_production_app_fits_from_the_data_it_is_given(monkeypatch):
    from advisor import api
    monkeypatch.setenv("ADVISOR_DATA", "data/tool_life.csv")
    assert TestClient(api.production_app()).post("/life", json=CUT).json()["tool_life_minutes"] == 545.3
```

```check
file tests/test_advisor.py -- Click "Create provided tests/test_advisor.py" above.
```

## Turning the equation round

Lesson 16.2's fitted model is

$$\log T = b_0 + w_V \log V + w_f \log f + w_d \log d + w_h\, h + w_{\text{dry}}\, \text{dry}$$

Given a wanted life $T$ and everything except the speed, collect the known terms into one number, $r = b_0 + w_f \log f + w_d \log d + w_h h + w_{\text{dry}}\,\text{dry}$. Then $\log T = r + w_V \log V$, so

$$\log V = \frac{\log T - r}{w_V}, \qquad V = e^{(\log T - r)/w_V}$$

Exact, instant, and no searching. A forest couldn't do this: it has no equation to solve, and you'd have to try speeds until one gave the right answer.

## Knowing what it doesn't know

The turning tests covered speeds from 121 to 319 m/min. Taylor's equation describes those tests well; whether it holds at 400 m/min, nobody has measured. Ask the advisor for a 60-minute life and the equation says 397 m/min. That might be right, or a different wear mechanism might take over at that speed and the insert might last 15 minutes. A model answering outside the conditions it was fitted on is **extrapolating**.

> **Extrapolation**: using a model for inputs outside the range of the data it was fitted on. Inside that range, a model is interpolating between things it has seen; outside, it's assuming the pattern carries on, with nothing to back that up.
>
> *Picture it as* a gauge's calibrated range. A gauge calibrated from 0 to 25 mm will still show a number if you force a 30 mm part into it, but nobody would release a part on that reading.

So the model records the **range** of each setting it was fitted on, and every answer says whether it's inside. Update `advisor/model.py`:

```python file=advisor/model.py
import numpy as np
from sklearn.linear_model import LinearRegression

SETTINGS = ["speed", "feed", "depth", "hardness"]


def taylor_features(X: np.ndarray) -> np.ndarray:
    """log speed, log feed, log depth, hardness, dry: the extended Taylor equation is linear in these."""
    return np.column_stack([np.log(X[:, 0]), np.log(X[:, 1]), np.log(X[:, 2]), X[:, 3], X[:, 4]])


class ToolLife:
    """Tool life from cutting conditions, by fitting the extended Taylor equation as a linear model in logs."""

    def fit(self, X: np.ndarray, life: np.ndarray) -> "ToolLife":
        self.regression_ = LinearRegression().fit(taylor_features(X), np.log(life))
        self.ranges_ = {name: (float(X[:, i].min()), float(X[:, i].max())) for i, name in enumerate(SETTINGS)}
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return np.exp(self.regression_.predict(taylor_features(X)))

    def tested(self, cut: list[float]) -> bool:
        """True if speed, feed, depth and hardness are all inside the ranges the model was fitted on."""
        return all(low <= value <= high for value, (low, high) in zip(cut, self.ranges_.values()))

    def speed_for(self, life: float, feed: float, depth: float, hardness: float, dry: float) -> float:
        """The cutting speed that should give this tool life: the fitted equation solved for speed."""
        w = self.regression_.coef_
        rest = self.regression_.intercept_ + w[1] * np.log(feed) + w[2] * np.log(depth) + w[3] * hardness + w[4] * dry
        return float(np.exp((np.log(life) - rest) / w[0]))
```

- **`self.ranges_`** records, for each of the four numeric settings, its smallest and largest training value: `{"speed": (121.0, 319.0), ...}`.
- **`tested`** checks each value against its range. **`zip(cut, self.ranges_.values())`** pairs the first four values of the cut with the four ranges; the fifth value (dry) has no range to check, so `zip` stops at the shorter list.
- **`speed_for`** is the rearranged equation: `w` is the five weights, `rest` is $r$, and the answer is $e^{(\log T - r)/w_V}$.

```check
run ".venv/Scripts/python -m pytest -q tests/test_advisor.py -k \"ranges or round_trip\"" label="the model knows its tested ranges, and speed_for solves the equation exactly" -- ranges_ = {name: (min, max)} per setting at fit; speed_for: exp((log(life) - rest) / w[0])
```

## The advisor's API

Two questions, two routes:

- **`POST /life`**: a planned cut; answers the predicted tool life in minutes.
- **`POST /speed`**: the wanted life and the other conditions; answers the speed to run at.

Both answers carry **`within_tested_range`**. That flag is the most important thing in the response. The line's software (or the person reading it) can show a warning, refuse to use an untested speed without an engineer's sign-off, or plan a test cut. Create `advisor/api.py`:

```python file=advisor/api.py
import os
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from advisor import data
from advisor.model import ToolLife


class Cut(BaseModel):
    speed: float
    feed: float
    depth: float
    hardness: float
    coolant: str


class Target(BaseModel):
    life: float
    feed: float
    depth: float
    hardness: float
    coolant: str


def create_app(model: ToolLife) -> FastAPI:
    app = FastAPI(title="Tool Life Advisor")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/life")
    def life(cut: Cut):
        try:
            row = data.to_row(cut.model_dump())
        except data.DataError as error:
            raise HTTPException(status_code=422, detail=str(error))
        minutes = float(model.predict(np.array([row]))[0])
        return {"tool_life_minutes": round(minutes, 1), "within_tested_range": model.tested(row)}

    @app.post("/speed")
    def speed(target: Target):
        if target.life <= 0:
            raise HTTPException(status_code=422, detail="life must be positive")
        try:
            row = data.to_row({**target.model_dump(), "speed": 100})
        except data.DataError as error:
            raise HTTPException(status_code=422, detail=str(error))
        recommended = model.speed_for(target.life, *row[1:])
        return {"speed": round(recommended), "within_tested_range": model.tested([recommended, *row[1:4]])}

    return app


def production_app() -> FastAPI:
    """Fit the model from the turning tests at start-up; which file is set by ADVISOR_DATA."""
    X, life = data.load(Path(os.environ.get("ADVISOR_DATA", "data/tool_life.csv")).read_text())
    return create_app(ToolLife().fit(X, life))
```

- **`data.to_row(...)`** (lesson 16.1) validates every request: the same physical limits as the training data, so `coolant: "maybe"` or a feed of 5 mm/rev is a 422 with a reason.
- **`{**target.model_dump(), "speed": 100}`**: the `/speed` request has no speed (that's the answer), but `to_row` checks all five settings, so a placeholder speed fills the gap; only the other four values are used.
- **`model.speed_for(target.life, *row[1:])`**: `*` spreads feed, depth, hardness and dry into the four remaining arguments.
- **`production_app`** fits the model at start-up from the CSV named by `ADVISOR_DATA`. Fitting this model takes milliseconds, so there's no need for lesson 15.2's saved artifacts; for a model that took an hour to train, there would be.

```check
run ".venv/Scripts/python -m pytest -q tests/test_advisor.py" label="the advisor answers tool life and cutting speed, flags untested conditions, and refuses bad requests"
```

## Ask it

Start the advisor and try it from the generated page:

```powershell
.venv\Scripts\python -m uvicorn advisor.api:production_app --factory
```

Open `http://127.0.0.1:8000/docs`, choose **POST /speed**, **Try it out**, and send `{"life": 300, "feed": 0.2, "depth": 1.5, "hardness": 220, "coolant": "yes"}`. The answer is `{"speed": 241, "within_tested_range": true}`. Change `coolant` to `"no"`: 222 m/min, slower to make up for running dry. Change `life` to 60: 397 m/min, and `"within_tested_range": false`. Press **Ctrl+C** to stop.

```predict
question: The cell lead wants 60-minute insert life to fit a shift pattern, and the advisor says 397 m/min, outside the tested range. What should happen?
choice: Run at 397 m/min: the model is accurate
choice: Treat 397 as a hypothesis: run a few test cuts at that speed, measure the tool life, add the results to the data and refit
choice: Refuse to ever cut faster than 319 m/min
answer: Treat 397 as a hypothesis: run a few test cuts at that speed, measure the tool life, add the results to the data and refit
explain: The equation's answer is a reasonable starting point (Taylor's law often holds well beyond the tested range) but it isn't evidence. The safe and cheap path is a short trial: if the inserts really last about an hour, those tests extend the model's range and the next answer is backed by data. This is the brief's "When it's wrong" in practice: a too-optimistic life means inserts failing mid-part, so untested answers get checked before they're trusted.
```

## Your own problem

1. **Answer the decision, not just the prediction.** What question from your brief does the user really ask? Can your model be turned round (solved, or searched) to answer it directly?
2. **Record the training ranges** and flag every answer outside them. It costs a few lines and prevents the most dangerous kind of wrong answer: a confident one with nothing behind it.
3. **Serve it** with an app factory and the status codes from lesson 15.4, and test the API the same way.
