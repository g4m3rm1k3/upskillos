---
title: 15.3 — Training in the Background: Experiments and Jobs
track: Production ML — The Defect Studio
runtime: none
concepts: background-jobs
revisits: model-persistence, ml-testing, sql, data-access-layers, web-api, exceptions, classes, testing
notebook: ml-sklearn-workflow
lab: 29
problem: Training a forest takes a couple of seconds here and could take an hour on real data. A web request that waits that long times out, and the engineer is left staring at a spinner with no idea whether anything is happening. How does a service start long work, answer straight away, and let people check on it, without losing track of anything, including failures?
---

A web request should be answered in well under a second. Training can't be: even this small forest takes a few seconds, and real ones take hours. If the studio trained inside the request, the engineer's browser would give up long before the model was ready, and if training crashed, nobody would know.

The usual answer is a **background job**. The request records the job, hands it to a worker, and answers immediately with "accepted, here's its number". The engineer (or the line's software) checks the number later. Every step is written to the database, so nothing is lost, failures included.

This lesson writes the two middle layers: `database.py`, which remembers datasets and experiments, and `services.py`, which runs them.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_services.py provided
# Tests for studio/database.py and studio/services.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_services.py
from concurrent.futures import Future, ThreadPoolExecutor
from pathlib import Path

import pytest

from studio import data, database, ml

PARTS = Path("data/parts.csv").read_text()
TWO_RUNS = [
    {"temperature": 245, "pressure": 800, "cooling": 15, "humidity": 40, "material": "A"},
    {"temperature": 220, "pressure": 800, "cooling": 15, "humidity": 40, "material": "A"},
]


class RightAway:
    """An executor that runs each job the moment it's submitted, so tests don't wait for threads."""

    def submit(self, job, *args):
        future = Future()
        future.set_result(job(*args))
        return future


class Later:
    """An executor that holds jobs until told to run them, to see what the studio says meanwhile."""

    def __init__(self):
        self.waiting = []

    def submit(self, job, *args):
        self.waiting.append((job, args))
        return Future()

    def run_all(self):
        for job, args in self.waiting:
            job(*args)


def make(tmp_path, executor=None):
    from studio import services
    return services.Studio(tmp_path, executor or RightAway())


def test_the_database_records_a_dataset_once_per_content(tmp_path):
    connection = database.connect(str(tmp_path / "studio.db"))
    first = database.add_dataset(connection, "line 3", 500, "abc")
    assert database.add_dataset(connection, "line 3 again", 500, "abc") == first
    assert database.get_dataset(connection, first)["name"] == "line 3"


def test_the_database_only_updates_known_columns(tmp_path):
    connection = database.connect(str(tmp_path / "studio.db"))
    experiment = database.add_experiment(connection, database.add_dataset(connection, "d", 1, "x"), "forest")
    database.update_experiment(connection, experiment, status="running")
    assert database.get_experiment(connection, experiment)["status"] == "running"
    with pytest.raises(ValueError):
        database.update_experiment(connection, experiment, **{"status = 'done', kind": "x"})


def test_upload_checks_and_stores_the_data(tmp_path):
    studio = make(tmp_path)
    assert studio.upload("line 3", PARTS) == {"id": 1, "rows": 500, "defect_rate": 0.366}
    with pytest.raises(data.DataError):
        studio.upload("broken", "temperature,defect\n")


def test_an_experiment_waits_in_the_queue_then_finishes(tmp_path):
    later = Later()
    studio = make(tmp_path, later)
    studio.upload("line 3", PARTS)
    assert studio.start(1, "forest")["status"] == "queued"
    later.run_all()
    finished = studio.experiment(1)
    assert (finished["status"], finished["accuracy"], finished["baseline"]) == ("done", 0.814, 0.634)


def test_predictions_wait_for_training(tmp_path):
    from studio import services
    later = Later()
    studio = make(tmp_path, later)
    studio.upload("line 3", PARTS)
    studio.start(1, "forest")
    with pytest.raises(services.NotReady):
        studio.predict(1, TWO_RUNS)
    later.run_all()
    hot, normal = studio.predict(1, TWO_RUNS)
    assert hot > normal


def test_a_failed_experiment_is_recorded_not_lost(tmp_path, monkeypatch):
    def broken(*args):
        raise RuntimeError("out of memory")
    monkeypatch.setattr(ml, "train", broken)
    studio = make(tmp_path)
    studio.upload("line 3", PARTS)
    studio.start(1, "forest")
    assert studio.experiment(1)["status"] == "failed"
    assert studio.experiment(1)["error"] == "out of memory"


def test_unknown_datasets_kinds_and_experiments_are_refused(tmp_path):
    from studio import services
    studio = make(tmp_path)
    with pytest.raises(services.NotFound):
        studio.start(7, "forest")
    studio.upload("line 3", PARTS)
    with pytest.raises(data.DataError):
        studio.start(1, "neural")
    with pytest.raises(services.NotFound):
        studio.experiment(99)


def test_real_background_threads(tmp_path):
    with ThreadPoolExecutor(max_workers=2) as pool:
        studio = make(tmp_path, pool)
        studio.upload("line 3", PARTS)
        studio.start(1, "forest")
        studio.start(1, "logistic")
    assert [studio.experiment(n)["status"] for n in (1, 2)] == ["done", "done"]
```

Three things in here are new:

- **`RightAway` and `Later`** are fake **executors**: objects with a `submit` method, like the real one in the last test. The studio will take its executor as a parameter (lesson 4.3's dependency injection), so tests can choose: `RightAway` runs jobs instantly (no waiting), `Later` holds them so a test can check what the studio says *while* a job is pending.
- **`monkeypatch.setattr(ml, "train", broken)`**: `monkeypatch` is a pytest fixture that temporarily replaces something, here `ml.train`, with a function that fails, and puts the original back after the test. It's how you test what happens when something goes wrong without having to make it really go wrong.
- **`**{"status = 'done', kind": "x"}`**: a column "name" that's actually SQL. It must be refused, not pasted into a query (Chapter 6).

```check
file tests/test_services.py -- Click "Create provided tests/test_services.py" above.
```

## Remembering experiments: the database layer

Two tables. A **dataset** is an uploaded file, identified by its content's fingerprint (lesson 15.2's idea again), so uploading the same file twice records it once. An **experiment** is one training job on one dataset, with a **status** that moves forward through four values:

```text
queued ──▶ running ──▶ done      (accuracy, baseline and the model's fingerprint recorded)
                  └──▶ failed    (the error recorded)
```

> **State machine**: a thing that is always in exactly one of a few named states, moving between them only by allowed transitions. Recording a job as a state machine means anyone can always answer "where is it?", and a job can't silently vanish.
>
> *Picture it as* a work order on the shop board: open, in progress, complete, or on hold with a reason. It's always in exactly one column, and moving it is a recorded event.

The `CHECK` constraint (lesson 5.2) makes the database itself refuse any other status. Create `studio/database.py`:

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
```

Most of this is Chapter 5. Three details:

- **`timeout=10`**: several threads will each have their own connection to the same file (next step). When two want to write at once, SQLite makes the second wait for the first's transaction to finish; `timeout` is how long it may wait, in seconds, before giving up with an error.
- **`update_experiment(…, **fields)`** takes any number of `name=value` arguments, so one function can set the status, or the status and accuracy and artifact together. The column names have to go into the SQL text itself (placeholders can only stand for *values*), which is exactly the injection risk of lesson 6.4. So every name is checked against **`UPDATABLE`**, a fixed allowlist, first. Only the values go through `?` placeholders.
- **`fields["finished"] = now()`**: reaching `done` or `failed` stamps the finishing time automatically, so it can't be forgotten.

```check
run ".venv/Scripts/python -m pytest -q tests/test_services.py -k database" label="datasets are recorded once per content; only known columns can be updated"
```

## Jobs in the background

A **thread** is a separate line of execution inside the same program: while one thread answers web requests, another can be training. Starting threads by hand is error-prone, so Python provides a **thread pool**:

> **Executor** (`concurrent.futures.ThreadPoolExecutor`): a pool of worker threads with one method that matters, `submit(job, *args)`. It queues the job, a free worker runs it, and `submit` immediately returns a **Future**: a handle to a result that will exist later.
>
> *Picture it as* the shop's job board and its operators. You pin a job card on the board (`submit`) and walk away with its ticket (the Future); whichever operator is free takes the next card. Two operators means two jobs at once; a third waits on the board.

The studio never waits on the Future. Instead, the job itself writes its progress to the database, which is what anyone checking on it reads. Create `studio/services.py`:

```python file=studio/services.py
import logging
import threading
from concurrent.futures import Executor
from pathlib import Path

import numpy as np

from studio import artifacts, data, database, ml

log = logging.getLogger("studio")


class NotFound(LookupError):
    pass


class NotReady(RuntimeError):
    pass


class Studio:
    """What the studio does, with no web code in it: the API calls these methods."""

    def __init__(self, folder: Path, executor: Executor):
        self.folder = Path(folder)
        self.folder.mkdir(parents=True, exist_ok=True)
        self.connections = threading.local()
        self.executor = executor
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
        (self.folder / "datasets" / f"{digest}.csv").write_text(text)
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
            X, y = data.parse_runs((self.folder / "datasets" / f"{dataset['sha256']}.csv").read_text())
            model, metrics = ml.train(X, y, record["kind"])
            artifact = artifacts.save(model, {"experiment": experiment_id, "kind": record["kind"],
                                              "dataset_sha256": dataset["sha256"], **metrics}, self.folder / "models")
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
        return [round(float(p), 4) for p in model.predict_proba(X)[:, 1]]
```

How the pieces fit:

- **`db` is a property with one connection per thread.** A SQLite connection belongs to the thread that opened it (Python refuses to let another thread use it, unless told otherwise). Sharing one connection between threads, even where it's allowed, lets their statements interleave: one thread's `INSERT` can read back the row number from another thread's statement. So each thread opens its **own** connection to the same file. **`threading.local()`** is an object whose attributes are separate for every thread: `self.connections.db` is a different connection on each thread. **`@property`** makes `self.db` look like an attribute while running this method each time it's read, so the rest of the code just says `self.db`. The rule in one line: *share the database, not the connection*.
- **`upload`** validates first (lesson 15.1), so bad data never reaches the folder or the database. The file is stored under its own fingerprint, and the database records it.
- **`start`** checks the request, records an experiment as `queued`, hands `self.run` to the executor, and returns at once. It never trains.
- **`run`** is the job itself, on a worker thread: mark it `running`, re-read the dataset, train (lesson 15.1), save the artifact (lesson 15.2), record `done` with its metrics and fingerprint.
- **`except Exception as error:`** catches *any* failure inside the job. A job that crashed on a worker thread would otherwise vanish: nobody is waiting on its Future to see the error. Here the failure becomes part of the record, `failed` with its message, and **`log.exception`** writes the full traceback to the log for whoever investigates. Catching everything is usually a bad habit; at the outer edge of a background job it's exactly right.
- **`model`** loads a saved model the first time it's needed and keeps it in `self.models`, a small **cache**: loading and checking a forest's file costs far more than using it. The cache is keyed by fingerprint, so a cached model can never be the wrong one.
- **`NotFound` and `NotReady`** are the service's own exceptions: "no such thing" and "not finished yet". The service layer doesn't know about HTTP; lesson 15.4 turns them into status codes 404 and 409.
- **`logging.getLogger("studio")`**: Python's standard logging. Messages go nowhere until something configures them, which the running server will do (lesson 15.5).

```check
run ".venv/Scripts/python -m pytest -q tests/test_services.py" label="experiments queue, run, finish or fail on the record, and real threads train two models at once" -- start: add_experiment (queued), executor.submit(self.run, id), return immediately; run: running → train → save → done, or failed with the error
```

```predict
question: The server restarts while an experiment is "running". What will the database say about it afterwards, and is that a problem?
choice: It will say "failed", automatically
choice: It will still say "running", forever: the thread doing the work is gone, but nothing updated the record
choice: It will say "done"
answer: It will still say "running", forever: the thread doing the work is gone, but nothing updated the record
explain: A thread lives inside the server process; when the process stops, so does the job, mid-step. The database only knows the last thing written. Real job systems handle this: on start-up, mark anything still "running" as failed ("interrupted by restart") and re-queue it, or use a separate job queue (such as Celery or RQ, with Redis) whose workers survive web-server restarts. For a studio with occasional training, a start-up sweep is enough, and it's one of the improvements in the chapter's last lesson.
```

The studio can now do everything it needs to, from Python. Next: a web API in front of it, and the tests an ML system needs beyond "does the code run".
