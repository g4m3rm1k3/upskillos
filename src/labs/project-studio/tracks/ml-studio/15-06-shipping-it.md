---
title: 15.6 — Shipping It: Restarts, Pins and a Container
track: Production ML — The Defect Studio
runtime: none
concepts: deployment
revisits: background-jobs, model-persistence, ml-testing, virtual-environments, web-security, testing
notebook: ml-sklearn-workflow
lab: 32
problem: The studio runs on your machine. It needs to run on the plant's server, the same way, for months, surviving restarts and power cuts, and be rebuilt identically next year when someone has to change it. What has to be true for that, and how do you package it?
---

"It works on my machine" is the oldest problem in software. Your machine has Python 3.13, the right library versions in `.venv`, the data in a folder you know about, and you're there to restart things. The plant's server has none of that. This lesson makes the studio **shippable**:

1. **It survives restarts.** Lesson 15.3's question: a job running when the server stops would say "running" forever. Fix it on start-up.
2. **It can be rebuilt exactly.** Every library version pinned, checked by a test.
3. **It runs the same anywhere.** A **container** holding Python, the libraries and the studio, built from a short recipe.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_shipping.py provided
# Tests for restart recovery and packaging. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_shipping.py
from concurrent.futures import Future
from pathlib import Path

from fastapi.testclient import TestClient

from studio import database

PARTS = Path("data/parts.csv").read_text()


class RightAway:
    def submit(self, job, *args):
        future = Future()
        future.set_result(job(*args))
        return future


class Never:
    """An executor whose jobs never start: the server stopped before it got to them."""

    def submit(self, job, *args):
        return Future()


def interrupted_studio(folder):
    """A studio folder as a crash leaves it: experiment 1 was running, experiment 2 still queued."""
    from studio import services
    before = services.Studio(folder, Never())
    before.upload("line 3", PARTS)
    before.start(1, "forest")
    before.start(1, "logistic")
    database.update_experiment(before.db, 1, status="running")


def test_recover_fails_interrupted_jobs_and_runs_queued_ones(tmp_path):
    from studio import services, startup
    interrupted_studio(tmp_path)
    after = services.Studio(tmp_path, RightAway())
    assert startup.recover(after) == {"interrupted": 1, "requeued": 1}
    assert after.experiment(1)["status"] == "failed"
    assert after.experiment(1)["error"] == "interrupted by a restart"
    assert after.experiment(2)["status"] == "done"


def test_the_production_app_sweeps_at_start_up(tmp_path, monkeypatch):
    from studio import api
    interrupted_studio(tmp_path / "studio-data")
    monkeypatch.setenv("STUDIO_DATA", str(tmp_path / "studio-data"))
    with TestClient(api.production_app()) as client:
        assert client.get("/experiments/1").json()["error"] == "interrupted by a restart"


def test_every_requirement_is_pinned():
    lines = [line for line in Path("requirements.txt").read_text().splitlines() if line.strip()]
    assert lines and all("==" in line for line in lines)


def test_the_dockerfile_builds_an_unprivileged_image():
    recipe = Path("Dockerfile").read_text()
    for line in ["FROM python:3.13-slim", "RUN pip install --no-cache-dir -r requirements.txt",
                 "USER studio", "ENV STUDIO_DATA=/data", "VOLUME /data"]:
        assert line in recipe.splitlines(), line
    assert '"--factory"' in recipe and '"0.0.0.0"' in recipe


def test_local_files_stay_out_of_the_image():
    ignored = Path(".dockerignore").read_text().split()
    assert {".venv/", "studio-data/"} <= set(ignored)
```

The last three tests read files rather than running code: a container can't be built inside a unit test, but its recipe can be checked for the things that matter.

```check
file tests/test_shipping.py -- Click "Create provided tests/test_shipping.py" above.
```

## Picking up after a restart

When the server process stops, any training thread stops with it, mid-job. The database still says `running`, and nothing will ever change that. Jobs still `queued` were never started and never will be, because the executor that held them is gone.

So on start-up the studio sweeps the database:

- anything **`running`** is marked **`failed`**, with the reason "interrupted by a restart", so nobody waits on it and the record says what happened;
- anything **`queued`** is submitted again.

> **Crash recovery**: designing a system so that after any stop (a restart, a crash, a power cut) it can work out from its own records what was in progress and put things in a consistent state. It's why lesson 15.3 recorded every job's state in the database rather than only in memory.
>
> *Picture it as* the first job after a power cut on the shop floor: walk the machines, scrap or re-run anything that was mid-cycle, and restart the queue from the job board. The job board is what makes that possible.

First, a query for experiments in a given state. Add `experiments_with_status` to the end of `studio/database.py`:

```python file=studio/database.py
import sqlite3
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    rows INTEGER NOT NULL,
    sha256 TEXT NOT NULL UNIQUE,
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS experiments (
    id INTEGER PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id),
    kind TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')),
    accuracy REAL,
    baseline REAL,
    artifact TEXT,
    error TEXT,
    created TEXT NOT NULL,
    finished TEXT
);
"""
UPDATABLE = {"status", "accuracy", "baseline", "artifact", "error"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path: str) -> sqlite3.Connection:
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    return connection


def add_dataset(connection, name: str, rows: int, sha256: str) -> int:
    with connection:
        existing = connection.execute("SELECT id FROM datasets WHERE sha256 = ?", (sha256,)).fetchone()
        if existing:
            return existing["id"]
        return connection.execute(
            "INSERT INTO datasets (name, rows, sha256, created) VALUES (?, ?, ?, ?)", (name, rows, sha256, now())
        ).lastrowid


def get_dataset(connection, dataset_id: int):
    return connection.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()


def add_experiment(connection, dataset_id: int, kind: str) -> int:
    with connection:
        return connection.execute(
            "INSERT INTO experiments (dataset_id, kind, status, created) VALUES (?, ?, 'queued', ?)", (dataset_id, kind, now())
        ).lastrowid


def update_experiment(connection, experiment_id: int, **fields) -> None:
    unknown = set(fields) - UPDATABLE
    if unknown:
        raise ValueError(f"not an updatable column: {sorted(unknown)}")
    if fields.get("status") in ("done", "failed"):
        fields["finished"] = now()
    assignments = ", ".join(f"{name} = ?" for name in fields)
    with connection:
        connection.execute(f"UPDATE experiments SET {assignments} WHERE id = ?", (*fields.values(), experiment_id))


def get_experiment(connection, experiment_id: int):
    return connection.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,)).fetchone()


def experiments_with_status(connection, status: str) -> list[int]:
    rows = connection.execute("SELECT id FROM experiments WHERE status = ? ORDER BY id", (status,)).fetchall()
    return [row["id"] for row in rows]
```

```check
run ".venv/Scripts/python -c \"import studio.database as d; print(d.experiments_with_status(d.connect(':memory:'), 'running'))\"" stdout="[]" label="experiments_with_status asks the database for the experiments in one state"
```

**`':memory:'`** is SQLite's name for a database that lives only in memory, created empty and gone when the connection closes: handy for a quick check.

## The start-up sweep

Now the sweep itself. Create `studio/startup.py`:

```python file=studio/startup.py
from studio import database
from studio.services import Studio


def recover(studio: Studio) -> dict:
    """After a restart: jobs that were running died with the old process; queued ones never started."""
    interrupted = database.experiments_with_status(studio.db, "running")
    for experiment_id in interrupted:
        database.update_experiment(studio.db, experiment_id, status="failed", error="interrupted by a restart")
    waiting = database.experiments_with_status(studio.db, "queued")
    for experiment_id in waiting:
        studio.executor.submit(studio.run, experiment_id)
    return {"interrupted": len(interrupted), "requeued": len(waiting)}
```

It's a separate module because it's neither a request (the API) nor part of normal work (the service): it runs once, when the studio starts.

```check
run ".venv/Scripts/python -m pytest -q tests/test_shipping.py -k recover" label="after a restart, interrupted jobs are marked failed and queued jobs are run" -- running → failed ("interrupted by a restart"); queued → executor.submit(studio.run, id)
```

## Calling it at start-up

`production_app` builds the studio for a real server, so that's where the sweep belongs. Update `studio/api.py` (only the imports and `production_app` change):

```python file=studio/api.py
import logging
import os
from concurrent.futures import ThreadPoolExecutor

import httpx2
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from studio import data, startup
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
    studio = Studio(folder, ThreadPoolExecutor(max_workers=2), Forecast(weather))
    logging.getLogger("studio").info("start-up: %s", startup.recover(studio))
    return create_app(studio)
```

The sweep's result goes to the log: "start-up: {'interrupted': 1, 'requeued': 0}" is exactly what someone investigating a missing model wants to find.

```check
run ".venv/Scripts/python -m pytest -q tests/test_shipping.py -k production" label="the production app sweeps the database when it starts"
```

## Pinned, so it can be rebuilt

Every line of `requirements.txt` says `==` and an exact version. That's not tidiness. A file saying just `scikit-learn` installs whatever version is newest *on the day it's installed*: rebuild the studio next year and you'd get a different scikit-learn, perhaps one that saves models differently (lesson 15.2's fingerprints change) or computes slightly different results. With exact pins, the same `requirements.txt` gives the same libraries, years apart. The test makes sure nobody adds an unpinned line.

```check
run ".venv/Scripts/python -m pytest -q tests/test_shipping.py -k pinned" label="every requirement is pinned to an exact version"
```

## A container

> **Container**: a packaged, isolated environment holding an application and everything it needs to run: an operating system's files, the language runtime, the libraries, and the code. Built from a recipe (a **Dockerfile**) into an **image**, which runs the same on any machine with a container engine such as **Docker**.
>
> *Picture it as* a machine cell delivered on its own pallet: machine, fixtures, tooling and program all set up and proven together. You don't rebuild it on site from a parts list and hope; you set the pallet down, connect power and air, and it runs as it did in the factory.

**Where the picture stops working:** a container shares the host computer's operating-system kernel; it isn't a whole separate machine. And it doesn't contain its *data*: the database and models live on a **volume**, storage outside the container, so a new version of the image can replace the old one without losing anything.

Create `Dockerfile` (no extension) in the project folder:

```dockerfile file=Dockerfile
FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY studio ./studio

RUN useradd --create-home studio && mkdir /data && chown studio /data
USER studio
ENV STUDIO_DATA=/data
VOLUME /data
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "studio.api:production_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

Read it top to bottom; each instruction adds a layer to the image:

- **`FROM python:3.13-slim`**: start from an official image with Python 3.13 on a minimal Linux.
- **`WORKDIR /app`**: work in `/app` inside the image.
- **`COPY requirements.txt .` then `RUN pip install …`**: install the pinned libraries. They're copied and installed *before* the code, so that changing the code doesn't force Docker to reinstall every library: it reuses the earlier layers.
- **`COPY studio ./studio`**: the code.
- **`RUN useradd … && chown studio /data`** and **`USER studio`**: create an ordinary user and run as it, not as the all-powerful `root`. If an attacker ever found a way to run code inside the studio (lesson 15.2's pickles, say), they'd have only that user's rights: lesson 6.5's defence in depth.
- **`ENV STUDIO_DATA=/data`** and **`VOLUME /data`**: the studio keeps its data in `/data`, which is marked as a volume, kept outside the container.
- **`EXPOSE 8000`** and **`CMD [...]`**: the studio listens on port 8000; the command starts uvicorn as in lesson 15.4, with **`--host 0.0.0.0`** so it accepts connections from outside the container (the default, 127.0.0.1, only accepts connections from inside).

```check
file Dockerfile
```

## Keeping things out of the image

Create `.dockerignore`, the list of things never to copy into the image:

```text file=.dockerignore
.venv/
studio-data/
__pycache__/
.pytest_cache/
tests/
data/
*.db
```

Your `.venv` holds Windows libraries that would be useless (and huge) on Linux; `studio-data` holds your local experiments, which mustn't end up baked into an image that gets shared; the tests and sample data aren't needed to run.

```check
run ".venv/Scripts/python -m pytest -q tests/test_shipping.py" label="the Dockerfile installs pinned libraries, runs as an ordinary user, and keeps data on a volume" -- FROM python:3.13-slim; pip install --no-cache-dir -r requirements.txt; USER studio; ENV STUDIO_DATA=/data; VOLUME /data
```

With Docker installed, two commands build the image and run it, with the data on a named volume:

```powershell
docker build -t defect-studio .
docker run -p 8000:8000 -v studio-data:/data defect-studio
```

**`-p 8000:8000`** connects port 8000 on your machine to port 8000 in the container; **`-v studio-data:/data`** attaches a volume called `studio-data` at `/data`. Stop the container, start a new one with the same volume, and every dataset, experiment and model is still there, and the start-up sweep tidies anything that was interrupted.

```predict
question: The plant's IT team asks: "If we restart the container every night for updates, what do we lose?" What's the answer?
choice: Everything since the last backup
choice: Nothing that's finished: data, experiments and models are on the volume; a job that happened to be training at that moment is marked failed and can be started again
choice: All trained models, because they're in memory
answer: Nothing that's finished: data, experiments and models are on the volume; a job that happened to be training at that moment is marked failed and can be started again
explain: Everything the studio needs to remember is written to /data: the SQLite database, the uploaded datasets and the fingerprinted model files. The container itself can be thrown away and replaced. The only casualty of a restart is work in progress, and the start-up sweep makes that visible instead of silent. (The volume still needs backing up: a disk failure is a different problem.)
```

## The architecture you arrived at

Look back at where this series' code started: one script that counted words. The studio now has:

| layer | file | its one job | built in |
|---|---|---|---|
| web | `api.py` | HTTP in, HTTP out; status codes | lesson 15.4 (Chapter 4's FastAPI) |
| service | `services.py` | what the studio does; jobs in the background | lesson 15.3 |
| start-up | `startup.py` | recover after a restart | this lesson |
| storage | `database.py`, `artifacts.py` | experiments in SQL; models by fingerprint | lessons 15.2–15.3 (Chapter 5) |
| ML | `ml.py`, `monitoring.py` | train, measure, watch for drift | lessons 15.1, 15.5 (Chapters 7–9) |
| boundaries | `data.py`, `forecast.py` | check what comes in; survive what goes out | lessons 15.1, 15.5 (Chapter 6) |

Every layer has its own tests, and the model has behavioural tests on top. None of this structure was designed up front: each piece was added when a real problem needed it, which is how good architecture usually arrives.

The last chapter is yours: your own problem, from question to deployed service, using everything in this series.
