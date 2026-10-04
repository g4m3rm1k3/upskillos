---
title: 15.4 — The API, and Tests an ML System Needs
track: Production ML — The Defect Studio
runtime: none
concepts: ml-testing
revisits: web-api, background-jobs, model-persistence, classification-metrics, ensembles, testing
notebook: ml-sklearn-workflow
lab: 30
problem: The studio works from Python. The line's software and the engineers need to reach it over HTTP, with clear answers when something's wrong. And "the tests pass" means the code runs; it doesn't mean the model is any good. What does an ML system need tested beyond the code?
---

The service layer does everything; this lesson puts a web API in front of it, using Chapter 4's FastAPI. Then it adds the tests that ordinary software doesn't need: tests about the **model's behaviour**, which can fail even when every line of code is correct.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.** This one tests the API; the next step adds a second file that tests the models.

```python file=tests/test_api.py provided
# Tests for studio/api.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_api.py
from concurrent.futures import Future
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

PARTS = Path("data/parts.csv").read_text()
RUN = {"temperature": 245, "pressure": 800, "cooling": 15, "humidity": 40, "material": "A"}


class RightAway:
    def submit(self, job, *args):
        future = Future()
        future.set_result(job(*args))
        return future


class Later:
    def __init__(self):
        self.waiting = []

    def submit(self, job, *args):
        self.waiting.append((job, args))
        return Future()


@pytest.fixture
def client(tmp_path):
    from studio import api, services
    return TestClient(api.create_app(services.Studio(tmp_path, RightAway())))


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_upload_answers_201_or_422_with_the_reason(client):
    created = client.post("/datasets", json={"name": "line 3", "csv": PARTS})
    assert created.status_code == 201 and created.json()["rows"] == 500
    refused = client.post("/datasets", json={"name": "bad", "csv": "temperature,defect\n"})
    assert refused.status_code == 422 and refused.json()["detail"] == "no rows"


def test_training_is_accepted_then_predicts(client):
    client.post("/datasets", json={"name": "line 3", "csv": PARTS})
    started = client.post("/experiments", json={"dataset_id": 1, "kind": "forest"})
    assert started.status_code == 202
    assert client.get("/experiments/1").json()["status"] == "done"
    answer = client.post("/experiments/1/predict", json={"runs": [RUN, {**RUN, "temperature": 220}]})
    assert answer.status_code == 200
    hot, normal = answer.json()["defect_probability"]
    assert hot > normal


def test_errors_have_the_right_status_codes(client):
    assert client.get("/experiments/9").status_code == 404
    assert client.post("/experiments", json={"dataset_id": 9, "kind": "forest"}).status_code == 404
    client.post("/datasets", json={"name": "line 3", "csv": PARTS})
    assert client.post("/experiments", json={"dataset_id": 1, "kind": "neural"}).status_code == 422
    client.post("/experiments", json={"dataset_id": 1, "kind": "forest"})
    bad_run = client.post("/experiments/1/predict", json={"runs": [{**RUN, "material": "C"}]})
    assert bad_run.status_code == 422 and "material" in bad_run.json()["detail"]
    missing = client.post("/experiments/1/predict", json={"runs": [{"temperature": 220}]})
    assert missing.status_code == 422


def test_predicting_before_training_finishes_is_a_conflict(tmp_path):
    from studio import api, services
    client = TestClient(api.create_app(services.Studio(tmp_path, Later())))
    client.post("/datasets", json={"name": "line 3", "csv": PARTS})
    assert client.post("/experiments", json={"dataset_id": 1, "kind": "forest"}).json()["status"] == "queued"
    assert client.post("/experiments/1/predict", json={"runs": [RUN]}).status_code == 409


def test_the_production_app_keeps_its_data_where_it_is_told(tmp_path, monkeypatch):
    from studio import api
    monkeypatch.setenv("STUDIO_DATA", str(tmp_path / "studio-data"))
    with TestClient(api.production_app()) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/experiments/1").status_code == 404
    assert (tmp_path / "studio-data" / "studio.db").exists()
```

```check
file tests/test_api.py -- Click "Create provided tests/test_api.py" above.
```

## And tests for the model

**This step: create the second supplied test file and read it.** It tests the trained model's behaviour rather than the code.

```python file=tests/test_model_quality.py provided
# Tests of the models' behaviour, not the code's. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_model_quality.py
from pathlib import Path

import numpy as np
import pytest

from studio import data, ml

X, Y = data.parse_runs(Path("data/parts.csv").read_text())
NORMAL = {"temperature": 225, "pressure": 800, "cooling": 15, "humidity": 40, "material": "A"}


def risk(model, **changes):
    return model.predict_proba(np.array([data.to_row({**NORMAL, **changes})]))[0, 1]


@pytest.fixture(scope="module")
def forest():
    return ml.train(X, Y, "forest")


def test_quality_gate_the_model_clearly_beats_the_baseline(forest):
    _, metrics = forest
    assert metrics["accuracy"] >= metrics["baseline"] + 0.1


def test_a_run_inside_the_process_window_is_low_risk(forest):
    model, _ = forest
    assert risk(model) < 0.2


def test_known_causes_raise_the_risk(forest):
    model, _ = forest
    for cause in [{"temperature": 245}, {"cooling": 9}, {"pressure": 600}]:
        assert risk(model, **cause) > risk(model) + 0.2, cause


def test_humidity_matters_for_material_b(forest):
    model, _ = forest
    assert risk(model, material="B", humidity=70) > risk(model, material="B", humidity=40)
```

- **`@pytest.fixture`** (lesson 0.5's fixtures): `client` is built fresh for each test that names it, around a studio in that test's own `tmp_path`.
- **`monkeypatch.setenv("STUDIO_DATA", …)`** sets an environment variable for one test only.
- **`with TestClient(...) as client:`** runs the app's start-up and shut-down around the block, the way a real server would.
- **`@pytest.fixture(scope="module")`**: train the forest **once** for the whole file rather than once per test; it doesn't change between them.
- **`{**NORMAL, **changes}`** merges two dictionaries, the second's values winning: a normal run with one setting changed.

```check
file tests/test_model_quality.py -- Click "Create provided tests/test_model_quality.py" above.
```

## The API layer

Each route does three things only: turn the request into a service call, return the result, and translate the service's exceptions into HTTP status codes. All the decisions live in the service. Create `studio/api.py`:

```python file=studio/api.py
import os
from concurrent.futures import ThreadPoolExecutor

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from studio import data
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

    return app


def production_app() -> FastAPI:
    """The real app: where to keep data comes from an environment variable; training runs on two threads."""
    return create_app(Studio(os.environ.get("STUDIO_DATA", "studio-data"), ThreadPoolExecutor(max_workers=2)))
```

- **`create_app(studio)`** is an **app factory**: it builds a FastAPI app around whichever studio it's given. Tests give it a studio in a temporary folder with a fake executor; `production_app` gives it the real thing. Nothing in the routes knows the difference.
- **`app.dependency_overrides[get_studio] = lambda: studio`** wires it in with lesson 4.3's dependency injection: every route that asks for `Depends(get_studio)` gets this app's studio. `get_studio` itself only raises, so forgetting to wire it is a loud error rather than a silent one.
- **Status codes say what kind of problem it was**, so the line's software can react without reading messages: **201** created, **202** accepted (work started, not finished), **404** no such thing, **409** conflict (exists, but not in a state to do that yet), **422** the request's content is invalid. FastAPI itself answers 422 when a field is missing or the wrong type, before your code runs (the `Run` model), and your `DataError`s answer 422 for values that are the right type but impossible.
- **`run.model_dump()`** turns a validated Pydantic `Run` back into a plain dictionary for `data.to_row`.
- **`production_app`** reads `STUDIO_DATA` from the environment, so where the studio keeps its files is decided when it's deployed, not written into the code (lesson 0.5's settings, the deployment way).

```check
run ".venv/Scripts/python -m pytest -q tests/test_api.py" label="the API answers 201, 202, 200, 404, 409 and 422 as appropriate, and the production app uses STUDIO_DATA" -- each route: call the studio; except DataError → 422, NotFound → 404, NotReady → 409
```

## Tests about the model, not the code

Every test so far checks that code does what it should. But a model can be built by perfectly correct code and still be useless or dangerous: trained on a bad upload, or on a week when the defect labels were entered wrongly. The second test file checks the **model's behaviour**, the way you'd check a new gauge before releasing it to the floor:

- **A quality gate**: the cross-validated accuracy must beat the do-nothing baseline by a clear margin (lesson 8.5). A model that can't is not released, however well the code ran.
- **Known good cases**: a run well inside the process window must come out low risk.
- **Directional tests**: things known to cause defects (too hot, cooling cut short, a short shot) must *raise* the predicted risk. If retraining on new data ever produced a model where a hotter run looked *safer*, this test would stop it.
- **Interactions you know about**: for material B, high humidity must raise the risk.

> **Behavioural tests for models** (sometimes called invariance and directional tests): tests that check a trained model's predictions agree with what's known about the problem: that some changes don't change the answer, and that others move it in a known direction. They catch models that score well on average while having learned something wrong.
>
> *Picture it as* the first-article inspection of a new fixture: besides "does it hold parts", you check it holds a good part in the right position and rejects a part loaded backwards. Known answers to known questions.

**Where the picture stops working:** a fixture either holds the part or doesn't. A model's predictions are probabilities from noisy data, so the tests need margins (`> risk + 0.2`, `< 0.2`), and choosing them is a judgement. Too tight and a perfectly good retrained model fails on noise; too loose and a bad one passes.

```check
run ".venv/Scripts/python -m pytest -q tests/test_model_quality.py" label="the trained forest passes its quality gate and behaves as known causes say it should"
```

## Run it for real

Start the studio as a real server:

```powershell
.venv\Scripts\python -m uvicorn studio.api:production_app --factory
```

**`--factory`** tells uvicorn that `production_app` is a function that *builds* the app, not the app itself. Open `http://127.0.0.1:8000/docs` in a browser: FastAPI's generated page (lesson 4.3) lists every route, with **Try it out** buttons. Upload `data/parts.csv` (paste its contents into the `csv` field), start an experiment, and refresh `GET /experiments/1` until it says `done`. A folder called `studio-data` appears beside your code, holding the database, the uploaded data and the saved model. Press **Ctrl+C** in the terminal to stop the server.

```predict
question: The quality-gate test fails after an engineer uploads a new month of data, though every other test passes. What's the right response?
choice: Lower the gate's margin so the test passes
choice: Don't release the new model: investigate the data first; the gate exists for exactly this
choice: Delete the test
answer: Don't release the new model: investigate the data first; the gate exists for exactly this
explain: A model that suddenly can't beat the baseline usually means something's wrong with the data, not the model: labels entered inconsistently, a sensor that died and reported zeros, two lines' data mixed together. That's what the gate is for. In a real deployment the studio would run these checks after training and refuse to mark the experiment usable, rather than relying on someone to run pytest. Lowering the bar to get green is the ML version of disabling a failing test.
```

The studio is a working service. The next lesson adds what it needs once real people depend on it: knowing what it's doing.
