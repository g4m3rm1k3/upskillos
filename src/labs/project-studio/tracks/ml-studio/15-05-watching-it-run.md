---
title: 15.5 — Watching It Run: Logs, Drift and Other People's Services
track: Production ML — The Defect Studio
runtime: none
concepts: deployment
revisits: ml-testing, model-persistence, descriptive-statistics, http, background-jobs, testing
notebook: ml-sklearn-workflow
lab: 30
problem: The forest was trained on runs from spring. In summer the shop is humid, and the line is asking about runs unlike anything the model saw. Nothing crashes; the predictions just quietly get worse. How would anyone know? And when the studio relies on a weather service that's sometimes slow or down, how does it keep working?
---

Ordinary software, once correct, stays correct. A model doesn't: it's correct *for the data it was trained on*, and the world moves. New material batches, a new season, a re-tooled machine: the runs the line asks about drift away from the runs the model learned from, and its predictions quietly get worse. No error, no crash, no failed test.

So a model in production has to be **watched**. This lesson adds three things the studio needs once people depend on it:

1. **A record of every prediction**: what was asked, what was answered, by which model, when.
2. **A drift check**: are the runs being asked about still like the training runs?
3. **A safe way to depend on someone else's service**: here a weather forecast, with timeouts, retries and a cache, so its bad days don't become the studio's.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_monitoring.py provided
# Tests for studio/monitoring.py, studio/forecast.py, and how the studio uses them. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_monitoring.py
import csv
import json
from concurrent.futures import Future
from pathlib import Path

import httpx2
import numpy as np
from fastapi.testclient import TestClient

from studio import data

PARTS = Path("data/parts.csv").read_text()
X, Y = data.parse_runs(PARTS)
with open("data/summer_runs.csv", newline="") as file:
    SUMMER = list(csv.DictReader(file))


class RightAway:
    def submit(self, job, *args):
        future = Future()
        future.set_result(job(*args))
        return future


def weather(*answers):
    """A pretend weather service that gives these answers in turn, and counts the requests."""
    requests = []

    def answer(request):
        requests.append(request)
        reply = answers[min(len(requests), len(answers)) - 1]
        if isinstance(reply, Exception):
            raise reply
        return httpx2.Response(reply[0], json=reply[1])

    return httpx2.Client(base_url="https://weather.example", transport=httpx2.MockTransport(answer)), requests


def test_profile_records_each_features_centre_and_spread():
    from studio import monitoring
    assert monitoring.profile(X)["humidity"] == {"mean": 44.796, "std": 13.8937}


def test_no_drift_in_the_training_data_itself():
    from studio import monitoring
    assert monitoring.drift(monitoring.profile(X), X) == {}


def test_summer_humidity_has_drifted():
    from studio import monitoring
    summer = np.array([data.to_row(run) for run in SUMMER])
    assert monitoring.drift(monitoring.profile(X), summer) == {"humidity": 1.82}


def test_prediction_log_keeps_one_json_line_per_prediction(tmp_path):
    from studio import monitoring
    log = monitoring.PredictionLog(tmp_path / "predictions.jsonl")
    for number in range(3):
        log.write(1, {"temperature": 220 + number}, 0.1 * number)
    lines = (tmp_path / "predictions.jsonl").read_text().splitlines()
    assert [json.loads(line)["run"]["temperature"] for line in lines] == [220, 221, 222]
    assert [entry["defect_probability"] for entry in log.recent(2)] == [0.1, 0.2]


def test_forecast_retries_then_remembers_the_answer():
    from studio import forecast
    client, requests = weather((503, {}), (503, {}), (200, {"humidity": 71}))
    waits, clock = [], [0.0]
    humidity = forecast.Forecast(client, sleep=waits.append, clock=lambda: clock[0])
    assert humidity.humidity() == 71 and len(requests) == 3 and waits == [0.5, 1.0]
    assert humidity.humidity() == 71 and len(requests) == 3
    clock[0] = 601
    assert humidity.humidity() == 71 and len(requests) == 4


def test_forecast_gives_up_gracefully():
    from studio import forecast
    client, requests = weather(httpx2.ConnectTimeout("too slow"))
    assert forecast.Forecast(client, sleep=lambda seconds: None).humidity() is None
    assert len(requests) == 3


def test_the_studio_reports_what_it_sees(tmp_path):
    from studio import forecast, services
    client, _ = weather((200, {"humidity": 71}))
    studio = services.Studio(tmp_path, RightAway(), forecast.Forecast(client))
    studio.upload("line 3", PARTS)
    studio.start(1, "forest")
    studio.predict(1, SUMMER)
    assert len((tmp_path / "predictions.jsonl").read_text().splitlines()) == 60
    assert studio.drift(1) == {"runs": 60, "drifted": {"humidity": 1.82}}
    assert studio.moisture_risk() == {"humidity": 71, "material_b_at_risk": True}
    assert services.Studio(tmp_path / "other", RightAway()).moisture_risk()["note"] == "forecast unavailable"


def test_the_api_shows_drift_and_moisture_risk(tmp_path):
    from studio import api, forecast, services
    client, _ = weather((200, {"humidity": 48}))
    web = TestClient(api.create_app(services.Studio(tmp_path, RightAway(), forecast.Forecast(client))))
    web.post("/datasets", json={"name": "line 3", "csv": PARTS})
    web.post("/experiments", json={"dataset_id": 1, "kind": "forest"})
    assert web.get("/experiments/1/drift").json() == {"runs": 0, "drifted": {}}
    web.post("/experiments/1/predict", json={"runs": SUMMER})
    assert web.get("/experiments/1/drift").json()["drifted"] == {"humidity": 1.82}
    assert web.get("/moisture-risk").json() == {"humidity": 48, "material_b_at_risk": False}
```

`data/summer_runs.csv` holds 60 runs from the humid months: the same machines and settings, but shop humidity between 55% and 85%. No labels: the parts haven't been inspected yet.

The **`weather`** helper builds a pretend weather service with `httpx2.MockTransport`: instead of sending requests over the network, the client calls `answer`, which replies with the next answer in the list (a status code and some JSON), or raises the given exception, like a service that's timing out. The test can then count exactly how many requests were made.

```check
file tests/test_monitoring.py -- Click "Create provided tests/test_monitoring.py" above.
```

## A record, and a drift check

> **Data drift**: a change, after deployment, in the distribution of the inputs a model receives, compared with what it was trained on. The model may still run perfectly, but it's now being asked about cases it learned little or nothing about, so its accuracy can no longer be trusted.
>
> *Picture it as* a gauge calibrated at 20 °C being used in a 35 °C shop. Every reading still appears on the display, with the same number of decimal places, but the readings are off, and nothing on the gauge tells you so. You only know by checking the conditions against the calibration certificate.

The calibration certificate here is a **profile** of the training data: each feature's mean and spread, saved with the model when it's trained. To check for drift, compare the recent inputs' mean against it, measured in training spreads (lesson 3.2's standardising, applied to a mean):

$$\text{shift} = \frac{\text{recent mean} - \text{training mean}}{\text{training spread}}$$

A shift of more than half a spread is flagged. That threshold is a judgement call: smaller catches drift sooner but raises more false alarms.

Create `studio/monitoring.py`:

```python file=studio/monitoring.py
import json
import time
from pathlib import Path

import numpy as np

from studio.data import FEATURES


def profile(X: np.ndarray) -> dict:
    """Each feature's mean and spread in the training data, saved with the model to compare against later."""
    return {name: {"mean": round(float(X[:, i].mean()), 4), "std": round(float(X[:, i].std()), 4)} for i, name in enumerate(FEATURES)}


def drift(training: dict, X_recent: np.ndarray, limit: float = 0.5) -> dict:
    """Features whose recent mean has moved more than `limit` training spreads from the training mean."""
    moved = {}
    for i, name in enumerate(FEATURES):
        shift = (X_recent[:, i].mean() - training[name]["mean"]) / training[name]["std"]
        if abs(shift) > limit:
            moved[name] = round(float(shift), 2)
    return moved


class PredictionLog:
    """One JSON line per prediction: what was asked, what was answered, by which model, when."""

    def __init__(self, path: Path):
        self.path = Path(path)

    def write(self, experiment_id: int, run: dict, probability: float) -> None:
        record = {"time": round(time.time(), 3), "experiment": experiment_id, "run": run, "defect_probability": probability}
        with self.path.open("a", encoding="utf-8") as file:
            file.write(json.dumps(record) + "\n")

    def recent(self, how_many: int) -> list[dict]:
        if not self.path.exists():
            return []
        lines = self.path.read_text(encoding="utf-8").splitlines()[-how_many:]
        return [json.loads(line) for line in lines]
```

- **`profile`** is a dictionary of dictionaries: `{"humidity": {"mean": 44.796, "std": 13.8937}, ...}`, plain numbers so it can be saved as JSON in the model's metadata.
- **JSON lines** (`.jsonl`): one complete JSON object per line, appended with **`open("a")`** (append, never overwrite). Each prediction adds one line, and any tool can read the file a line at a time. This is the simplest form of **structured logging**: records a program can query, not sentences only a person can read.
- **`time.time()`**: seconds since 1970, the standard machine-readable timestamp.
- **`[-how_many:]`**: the last `how_many` lines (lesson 0.2's slicing from the end).

The log records exactly what the model was asked and answered. When an engineer says "the studio said that run was safe", you can find the run, the answer and which model gave it. And once the parts are inspected, those records are the new labelled data for the next training.

```check
run ".venv/Scripts/python -m pytest -q tests/test_monitoring.py -k \"profile or drift_in or drifted or json_line\"" label="the training profile, the drift check (summer humidity is 1.82 spreads high), and the prediction log"
```

## Depending on someone else's service

Material B absorbs moisture, so the studio will warn when tomorrow's forecast humidity is high. That means calling an outside weather service, and outside services fail: slow, down, overloaded, returning errors. The studio must not hang or crash because of it.

> **Resilient calls to external services** use three habits: a **timeout** (never wait for ever: give up after 2 seconds), **retries with backoff** (try again a few times, waiting longer each time, because many failures are momentary), and a **cache** (keep a recent good answer and reuse it, so the service is called rarely and its bad moments are often never noticed). And when it all fails, a **fallback**: an honest "unavailable" instead of a crash.
>
> *Picture it as* ordering from a supplier who's sometimes slow to answer the phone. You don't hold forever; you call back a couple of times, a bit later each time; you keep last week's price list rather than phoning for every quote; and if they can't be reached, you say so and carry on rather than stopping the line.

Create `studio/forecast.py`:

```python file=studio/forecast.py
import time

import httpx2


class Forecast:
    """The plant's humidity forecast from an outside weather service, with a timeout, retries and a cache."""

    def __init__(self, client: httpx2.Client, retries: int = 3, wait: float = 0.5, cache_seconds: float = 600,
                 clock=time.monotonic, sleep=time.sleep):
        self.client, self.retries, self.wait, self.cache_seconds = client, retries, wait, cache_seconds
        self.clock, self.sleep = clock, sleep
        self.cached = None

    def humidity(self) -> float | None:
        if self.cached and self.clock() - self.cached[0] < self.cache_seconds:
            return self.cached[1]
        for attempt in range(self.retries):
            try:
                response = self.client.get("/humidity", timeout=2.0)
                response.raise_for_status()
                value = float(response.json()["humidity"])
                self.cached = (self.clock(), value)
                return value
            except (httpx2.TimeoutException, httpx2.ConnectError, httpx2.HTTPStatusError):
                if attempt < self.retries - 1:
                    self.sleep(self.wait * 2 ** attempt)
        return None
```

- **`client: httpx2.Client`** is passed in, not created inside (dependency injection again): the real app passes a client for the real service; the tests pass one wired to `MockTransport`.
- **`clock` and `sleep` are passed in too**, defaulting to the real `time.monotonic` and `time.sleep`. Tests give a fake clock they can move forward ("ten minutes later") and a fake sleep that just records how long it would have waited, so testing retries takes milliseconds rather than seconds. **`time.monotonic()`** is a clock that only ever moves forward, unlike the time of day, which can jump when the computer's clock is adjusted.
- **`timeout=2.0`**: give up on one request after two seconds.
- **`response.raise_for_status()`** turns an error status (like 503, "service unavailable") into an `HTTPStatusError`, so errors and timeouts are handled in the same place.
- **`self.wait * 2 ** attempt`**: wait 0.5 s, then 1 s, then (if there were more attempts) 2 s. This is **exponential backoff**: if the service is overloaded, hammering it with instant retries makes it worse.
- **`self.cached = (self.clock(), value)`**: the answer and when it was fetched. For the next 600 seconds, `humidity()` returns it without calling the service at all.
- **`return None`**: after the last attempt fails, say "don't know". The caller decides what that means.

```check
run ".venv/Scripts/python -m pytest -q tests/test_monitoring.py -k forecast" label="the forecast retries with backoff, caches its answer, and gives up gracefully" -- for each attempt: get with timeout=2.0; raise_for_status; on timeout/connect/status errors sleep(wait * 2 ** attempt) before the next try; return None at the end
```

## Wiring it in: the service

The studio's service now records each model's training profile, logs every prediction, and answers two new questions. Update `studio/services.py`:

```python file=studio/services.py
import logging
import threading
from concurrent.futures import Executor
from pathlib import Path

import numpy as np

from studio import artifacts, data, database, ml, monitoring

log = logging.getLogger("studio")


class NotFound(LookupError):
    pass


class NotReady(RuntimeError):
    pass


class Studio:
    """What the studio does, with no web code in it: the API calls these methods."""

    def __init__(self, folder: Path, executor: Executor, forecast=None):
        self.folder = Path(folder)
        self.folder.mkdir(parents=True, exist_ok=True)
        self.connections = threading.local()
        self.executor = executor
        self.forecast = forecast
        self.predictions = monitoring.PredictionLog(self.folder / "predictions.jsonl")
        self.models = {}

    @property
    def db(self):
        """This thread's own connection to the studio's database, opened the first time it's needed."""
        if not hasattr(self.connections, "db"):
            self.connections.db = database.connect(str(self.folder / "studio.db"))
        return self.connections.db

    def upload(self, name: str, text: str) -> dict:
        X, y = data.parse_runs(text)
        digest = artifacts.fingerprint(text.encode())
        (self.folder / "datasets").mkdir(exist_ok=True)
        (self.folder / "datasets" / f"{digest}.csv").write_text(text, encoding="utf-8")
        dataset_id = database.add_dataset(self.db, name, len(y), digest)
        log.info("dataset %s uploaded: %d runs", dataset_id, len(y))
        return {"id": dataset_id, "rows": len(y), "defect_rate": round(float(y.mean()), 3)}

    def start(self, dataset_id: int, kind: str) -> dict:
        if kind not in ml.KINDS:
            raise data.DataError(f"kind must be one of {', '.join(ml.KINDS)}")
        if database.get_dataset(self.db, dataset_id) is None:
            raise NotFound(f"dataset {dataset_id}")
        experiment_id = database.add_experiment(self.db, dataset_id, kind)
        self.executor.submit(self.run, experiment_id)
        return self.experiment(experiment_id)

    def run(self, experiment_id: int) -> None:
        database.update_experiment(self.db, experiment_id, status="running")
        try:
            record = database.get_experiment(self.db, experiment_id)
            dataset = database.get_dataset(self.db, record["dataset_id"])
            X, y = data.parse_runs((self.folder / "datasets" / f"{dataset['sha256']}.csv").read_text(encoding="utf-8"))
            model, metrics = ml.train(X, y, record["kind"])
            artifact = artifacts.save(model, {"experiment": experiment_id, "kind": record["kind"],
                                              "dataset_sha256": dataset["sha256"], "profile": monitoring.profile(X),
                                              **metrics}, self.folder / "models")
            database.update_experiment(self.db, experiment_id, status="done", artifact=artifact, **metrics)
            log.info("experiment %s done: accuracy %.3f", experiment_id, metrics["accuracy"])
        except Exception as error:
            database.update_experiment(self.db, experiment_id, status="failed", error=str(error))
            log.exception("experiment %s failed", experiment_id)

    def experiment(self, experiment_id: int) -> dict:
        record = database.get_experiment(self.db, experiment_id)
        if record is None:
            raise NotFound(f"experiment {experiment_id}")
        return {key: record[key] for key in ("id", "dataset_id", "kind", "status", "accuracy", "baseline", "error")}

    def model(self, experiment_id: int):
        record = database.get_experiment(self.db, experiment_id)
        if record is None:
            raise NotFound(f"experiment {experiment_id}")
        if record["status"] != "done":
            raise NotReady(f"experiment {experiment_id} is {record['status']}")
        if record["artifact"] not in self.models:
            self.models[record["artifact"]] = artifacts.load(self.folder / "models", record["artifact"])
        return self.models[record["artifact"]]

    def predict(self, experiment_id: int, runs: list[dict]) -> list[float]:
        model = self.model(experiment_id)
        X = np.array([data.to_row(run) for run in runs])
        probabilities = [round(float(p), 4) for p in model.predict_proba(X)[:, 1]]
        for run, probability in zip(runs, probabilities):
            self.predictions.write(experiment_id, run, probability)
        return probabilities

    def drift(self, experiment_id: int, how_many: int = 200) -> dict:
        self.model(experiment_id)
        record = database.get_experiment(self.db, experiment_id)
        recent = [entry["run"] for entry in self.predictions.recent(how_many) if entry["experiment"] == experiment_id]
        if not recent:
            return {"runs": 0, "drifted": {}}
        training = artifacts.metadata(self.folder / "models", record["artifact"])["profile"]
        return {"runs": len(recent), "drifted": monitoring.drift(training, np.array([data.to_row(run) for run in recent]))}

    def moisture_risk(self) -> dict:
        humidity = self.forecast.humidity() if self.forecast else None
        if humidity is None:
            return {"humidity": None, "material_b_at_risk": None, "note": "forecast unavailable"}
        return {"humidity": humidity, "material_b_at_risk": humidity > 55}
```

What changed, and nothing else did:

- **`__init__`** takes an optional `forecast`, and opens the prediction log.
- **`run`** saves the training data's `profile` in the model's metadata: the model now carries its own calibration certificate.
- **`predict`** writes every run and its answer to the log.
- **`drift`** first calls `self.model(...)`, purely for its checks (the experiment exists and is done). Then it takes the most recent logged runs **for this experiment**, and compares them with the profile saved alongside this model.
- **`moisture_risk`** asks the forecast and turns "don't know" into an honest answer rather than an error. 55% is the humidity above which, in lesson 9.2, material B's defect rate rose.

```check
run ".venv/Scripts/python -m pytest -q tests/test_monitoring.py -k studio_reports" label="the studio logs predictions, finds the summer drift, and reports moisture risk, or that the forecast is unavailable"
```

## Wiring it in: the API

Two routes, and the production app gets a real forecast client and switches logging on. Update `studio/api.py`:

```python file=studio/api.py
import logging
import os
from concurrent.futures import ThreadPoolExecutor

import httpx2
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from studio import data
from studio.forecast import Forecast
from studio.services import NotFound, NotReady, Studio


class Upload(BaseModel):
    name: str
    csv: str


class NewExperiment(BaseModel):
    dataset_id: int
    kind: str


class Run(BaseModel):
    temperature: float
    pressure: float
    cooling: float
    humidity: float
    material: str


class Runs(BaseModel):
    runs: list[Run]


def get_studio() -> Studio:
    raise RuntimeError("create_app sets the studio")


def create_app(studio: Studio) -> FastAPI:
    app = FastAPI(title="Defect Studio")
    app.dependency_overrides[get_studio] = lambda: studio

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/datasets", status_code=201)
    def upload(body: Upload, studio: Studio = Depends(get_studio)):
        try:
            return studio.upload(body.name, body.csv)
        except data.DataError as error:
            raise HTTPException(status_code=422, detail=str(error))

    @app.post("/experiments", status_code=202)
    def start(body: NewExperiment, studio: Studio = Depends(get_studio)):
        try:
            return studio.start(body.dataset_id, body.kind)
        except data.DataError as error:
            raise HTTPException(status_code=422, detail=str(error))
        except NotFound as error:
            raise HTTPException(status_code=404, detail=f"no {error}")

    @app.get("/experiments/{experiment_id}")
    def experiment(experiment_id: int, studio: Studio = Depends(get_studio)):
        try:
            return studio.experiment(experiment_id)
        except NotFound as error:
            raise HTTPException(status_code=404, detail=f"no {error}")

    @app.post("/experiments/{experiment_id}/predict")
    def predict(experiment_id: int, body: Runs, studio: Studio = Depends(get_studio)):
        try:
            return {"defect_probability": studio.predict(experiment_id, [run.model_dump() for run in body.runs])}
        except NotFound as error:
            raise HTTPException(status_code=404, detail=f"no {error}")
        except NotReady as error:
            raise HTTPException(status_code=409, detail=str(error))
        except data.DataError as error:
            raise HTTPException(status_code=422, detail=str(error))

    @app.get("/experiments/{experiment_id}/drift")
    def drift(experiment_id: int, studio: Studio = Depends(get_studio)):
        try:
            return studio.drift(experiment_id)
        except NotFound as error:
            raise HTTPException(status_code=404, detail=f"no {error}")
        except NotReady as error:
            raise HTTPException(status_code=409, detail=str(error))

    @app.get("/moisture-risk")
    def moisture_risk(studio: Studio = Depends(get_studio)):
        return studio.moisture_risk()

    return app


def production_app() -> FastAPI:
    """The real app: settings from environment variables, training on two threads, logs to the console."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    folder = os.environ.get("STUDIO_DATA", "studio-data")
    weather = httpx2.Client(base_url=os.environ.get("WEATHER_URL", "https://weather.example"))
    return create_app(Studio(folder, ThreadPoolExecutor(max_workers=2), Forecast(weather)))
```

- **`logging.basicConfig(...)`** switches on the `log.info(...)` and `log.exception(...)` messages from lesson 15.3, each with a timestamp, level and source: "2026-10-04 09:15:02 INFO studio: experiment 3 done: accuracy 0.814".
- **`WEATHER_URL`**: which weather service to use is configuration, not code, like `STUDIO_DATA`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_monitoring.py" label="the API reports drift after the summer runs and the moisture risk from the forecast"
```

```predict
question: The drift check flags summer humidity at 1.82 spreads above training. What should happen next?
choice: Retrain immediately on the old data
choice: Treat the model's answers for these runs with caution, collect the summer runs' inspection results, and retrain once enough have been labelled
choice: Ignore it: the model's accuracy was 81%
answer: Treat the model's answers for these runs with caution, collect the summer runs' inspection results, and retrain once enough have been labelled
explain: Drift says the model is being asked about conditions it saw little of: spring's data had few humid days, so its 81% says little about summer. The fix is new labelled data: the prediction log holds every summer run that was asked about, and inspection results will label them. Retrain on spring plus summer, check the quality gate and behavioural tests (lesson 15.4), and the new model's profile will include humid days. Monitoring, labelling, retraining and re-testing is the loop that keeps a production model honest.
```

The studio now knows what it's doing and copes when others let it down. One lesson left: packaging it so it runs the same on any machine.
