---
title: 5.3 — A Repository, and a Service That Remembers
track: Databases — The Experiment Database
runtime: none
concepts: data-access-layers
revisits: sql, web-api, classes, configuration, testing
lab: 29
problem: The web service and the database both work, separately. How do you connect them without scattering SQL through the web code, and without the tests writing into your real data?
---

Chapter 4's service and this chapter's database meet in this lesson: every `POST /predict` will record the house, the price and the model, and two new endpoints will read the history back. The question is **where the SQL goes**.

The quick answer is "in the route functions": `predict` could call `connection.execute("INSERT …")` directly. It works, for one route. With ten routes, SQL is everywhere: the same query written three times with small differences, routes that can't be tested without a real database, and a change to a table meaning a search through every route. So this lesson adds one layer between the web and the database, and gives it one job.

> **Repository** (in software design): a class whose methods are the only way the rest of the program reads or writes a kind of stored data. Callers ask it for things in the program's own terms ("the last 10 predictions", "the id of this model"); only the repository knows the SQL.
>
> *Picture it as* the stores counter in a plant. Production asks for "two M6 × 20 bolts"; the storekeeper knows which aisle, which bin, and how the stock records are kept. Reorganise the stores and production doesn't notice, because it only ever talked to the counter. **Where the picture stops working:** a storekeeper can use judgement; a repository should do exactly what its method names say and nothing else.

The architecture you're building, top to bottom:

```text
HTTP request
   ↓
route function (app.py)          knows HTTP and the House rules; no SQL
   ↓
Repository (repository.py)       knows which queries answer which questions
   ↓
experiments.py + sqlite3         knows the tables and the SQL
   ↓
experiments.db                   the file on disk
```

Each layer talks only to the one below it. That's a **boundary**, the same idea as `read_text` in lesson 0.4 and `house_from` in lesson 4.2: one place that's allowed to know about one thing.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_service.py provided
# Tests for repository.py and app.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_service.py
import threading

import pytest
from fastapi.testclient import TestClient
from pytest import approx

HOUSE = {"sqft": 1500, "bedrooms": 3, "age": 20}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("PRICE_DB", str(tmp_path / "service.db"))
    import app
    with TestClient(app.app) as client:
        yield client


def test_repository_creates_a_model_only_once(tmp_path):
    from repository import Repository
    repository = Repository.open(tmp_path / "r.db")
    first = repository.model_id("linear-v1", ["sqft"])
    assert repository.model_id("linear-v1", ["sqft"]) == first == 1


def test_repository_history_names_each_prediction_s_model(tmp_path):
    from repository import Repository
    repository = Repository.open(tmp_path / "r.db")
    repository.record(repository.model_id("linear-v1", ["sqft"]), 1500, 3, 20, 1.0)
    [row] = repository.history()
    assert row["model"] == "linear-v1"
    assert row["sqft"] == 1500


def test_repository_can_be_used_from_another_thread(tmp_path):
    from repository import Repository
    repository = Repository.open(tmp_path / "r.db")
    errors = []
    def use():
        try:
            repository.summary()
        except Exception as error:
            errors.append(error)
    worker = threading.Thread(target=use)
    worker.start()
    worker.join()
    assert errors == []


def test_service_records_each_prediction(client):
    first = client.post("/predict", json=HOUSE).json()
    second = client.post("/predict", json={**HOUSE, "sqft": 2000}).json()
    assert first == {"id": 1, "price": approx(252006.15)}
    assert second["id"] == 2


def test_service_history_is_newest_first(client):
    for sqft in [1000, 1500, 2000]:
        client.post("/predict", json={**HOUSE, "sqft": sqft})
    history = client.get("/history", params={"limit": 2}).json()
    assert [row["sqft"] for row in history] == [2000, 1500]


def test_service_history_limit_is_checked(client):
    assert client.get("/history", params={"limit": 0}).status_code == 422


def test_service_models_shows_the_summary(client):
    client.post("/predict", json=HOUSE)
    client.post("/predict", json=HOUSE)
    assert client.get("/models").json() == [{"name": "linear-v1", "predictions": 2, "average_price": approx(252006.15)}]


def test_service_history_survives_a_restart(client):
    client.post("/predict", json=HOUSE)
    import app
    with TestClient(app.app) as restarted:
        assert len(restarted.get("/history").json()) == 1
```

The fixture is the important part:

- **`monkeypatch.setenv("PRICE_DB", …)`** sets an **environment variable** for the length of one test (lesson 0.5's `monkeypatch`, now for the environment instead of the current folder). The service will read the database's location from `PRICE_DB`, so each test gets its own empty database file in `tmp_path`, and **no test ever writes into your real `experiments.db`**.
- **`test_repository_can_be_used_from_another_thread`** opens a repository in the test's thread and uses it in another. Lesson 5.2 said why that matters: the web server runs requests on several threads.
- **`[row] = repository.history()`** is unpacking into a one-element list: it takes the single row out, and fails loudly if there isn't exactly one.

```check
file tests/test_service.py -- Click "Create provided tests/test_service.py" above.
```

## The repository

Create `repository.py`:

```python file=repository.py
from pathlib import Path

import experiments


class Repository:
    def __init__(self, connection):
        self.connection = connection

    @classmethod
    def open(cls, path: str | Path) -> "Repository":
        return cls(experiments.connect(path, check_same_thread=False))

    def model_id(self, name: str, features: list[str]) -> int:
        row = self.connection.execute("SELECT id FROM models WHERE name = ?", (name,)).fetchone()
        if row is not None:
            return row["id"]
        return experiments.add_model(self.connection, name, features)

    def record(self, model_id: int, sqft: float, bedrooms: float, age: float, price: float) -> int:
        return experiments.record(self.connection, model_id, sqft, bedrooms, age, price)

    def history(self, limit: int = 10) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT predictions.id, models.name AS model, sqft, bedrooms, age, price, predictions.created_at
            FROM predictions
            JOIN models ON models.id = predictions.model_id
            ORDER BY predictions.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]

    def summary(self) -> list[dict]:
        return experiments.summary(self.connection)

    def close(self) -> None:
        self.connection.close()
```

A class again because, like lesson 3.2's `Standardizer`, its methods share state: the open connection. Each method name says what's being asked, in the service's terms.

- **`@classmethod def open(cls, path)`**: a **class method** is called on the class itself, `Repository.open("x.db")`, not on an object, and receives the class as `cls`. It's the usual way to give a class a second, more convenient way of being created: `open` connects to the file and then calls `cls(connection)`, which runs `__init__`. The tests can also build a `Repository` from any connection they like, through `__init__`.
- **`check_same_thread=False`**: the reason `connect` grew that parameter in lesson 5.2. Turning the check off is safe here **because each request gets its own repository** (next step), so no two threads ever use one connection at the same moment; the check was protecting against that, and the design rules it out.
- **`model_id`** is "**get or create**": find the model by its unique name, and add it only if it isn't there. The service calls it on every prediction, and it returns the same id every time.
- **`history`** joins predictions to models, so each row carries its model's **name** instead of a bare number.

```check
run ".venv/Scripts/python -m pytest -q tests/test_service.py -k repository" label="the repository finds or creates models, names them in the history, and works across threads" -- Repository.open connects with check_same_thread=False.
```

## The service remembers

Now the web service. Create `app.py`. It's Chapter 4's service with the page left out (so the database part stands out), and three changes:

```python file=app.py
import os
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, FastAPI, Query
from pydantic import BaseModel, Field

import predictor
from repository import Repository

MODEL_NAME = "linear-v1"

app = FastAPI(title="House price estimator")


class House(BaseModel):
    sqft: float = Field(gt=0)
    bedrooms: float = Field(ge=0)
    age: float = Field(ge=0)


class Recorded(BaseModel):
    id: int
    price: float


def get_repository() -> Iterator[Repository]:
    repository = Repository.open(os.environ.get("PRICE_DB", "experiments.db"))
    try:
        yield repository
    finally:
        repository.close()


Repo = Annotated[Repository, Depends(get_repository)]


@app.post("/predict")
def predict(house: House, repository: Repo) -> Recorded:
    price = round(predictor.predict(house.sqft, house.bedrooms, house.age), 2)
    model_id = repository.model_id(MODEL_NAME, predictor.FEATURES)
    prediction_id = repository.record(model_id, house.sqft, house.bedrooms, house.age, price)
    return Recorded(id=prediction_id, price=price)


@app.get("/history")
def history(repository: Repo, limit: Annotated[int, Query(ge=1, le=100)] = 10) -> list[dict]:
    return repository.history(limit)


@app.get("/models")
def models(repository: Repo) -> list[dict]:
    return repository.summary()
```

**1. A dependency with `yield`.** `get_repository` is a dependency (lesson 4.3) written like lesson 4.1's fixture: before `yield` is setup, after it is teardown. For each request FastAPI calls it, hands the yielded repository to the route, and after the response is ready, runs the `finally` block, which closes the connection, **even if the route raised an exception**. One connection per request, always closed: the reason `check_same_thread=False` is safe.

*Picture it as* the tool crib again: a tool is signed out for one job and signed back in at the end, whatever happened during the job.

**2. The database's location is configuration.** `os.environ.get("PRICE_DB", "experiments.db")` reads the **environment variable** `PRICE_DB`, or uses `experiments.db` if it isn't set.

> **Environment variable**: a named text value the operating system gives every program when it starts, inherited from whatever started it (here, the terminal). Programs read them for settings that differ between machines or runs: where the database is, which port to use, later on, secret keys.
>
> *Picture it as* the setup sheet clipped to the machine for this particular job, as opposed to the program itself: the same program runs on the test bench with the test sheet and in production with the production sheet. Lesson 0.5's settings file did the same job; environment variables are the standard way for services, because every hosting platform can set them.

The tests set `PRICE_DB` to a fresh file in `tmp_path`, so they can never touch your real data.

**3. Routes with no SQL in them.** `predict` asks the repository for the model's id and to record the prediction, then returns the new prediction's `id` with the price, so a client can refer back to it. `history` and `models` are one line each. `Query(ge=1, le=100)` validates `limit` like any other input: a client can't ask for 0 rows or a million.

Run it, make a few estimates, and read the history:

```powershell
.venv\Scripts\python -m uvicorn app:app --reload
```

Open `http://127.0.0.1:8000/docs`, use **Try it out** on `POST /predict` three times with different houses, then **Try it out** on `GET /history` and `GET /models`. Stop the server, start it again, and read `/history` once more: everything's still there, in `experiments.db`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_service.py" label="the service records every prediction, reads the history back newest first, and keeps it across restarts" -- get_repository yields Repository.open(os.environ.get("PRICE_DB", "experiments.db")) and closes it in finally.
```

## Look inside the file

`experiments.db` is a file like any other, and Python's prompt can read it directly, without the service:

```text
>>> import experiments
>>> db = experiments.connect("experiments.db")
>>> [dict(row) for row in db.execute("SELECT id, name, features FROM models")]
[{'id': 1, 'name': 'linear-v1', 'features': 'sqft,bedrooms,age'}]
>>> db.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
3
```

(Your count is however many estimates you made.) Being able to inspect the data with plain SQL, from outside the program that wrote it, is one of the best reasons to use a database: when something looks wrong in the service, you can ask the data directly.

```predict
question: Two people press "Estimate" at the same moment. How many database connections are open while both requests are being handled?
choice: One, shared by both requests
choice: Two, one per request
choice: None: SQLite doesn't use connections
answer: Two, one per request
explain: get_repository runs once per request, so each request opens its own connection and closes it when its response is done. That's what makes check_same_thread=False safe: no connection is ever used by two threads at once.

Both connections write to the same file, and SQLite makes them take turns: a write locks the file for the few milliseconds it takes. For a service with many simultaneous writers, a database server such as PostgreSQL handles that better, and Chapter 15 makes that switch. The repository is why it will be a small change: only repository.py and experiments.py know which database is underneath.
```

### What you have

```text
POST /predict ─▶ route ─▶ Repository ─▶ experiments.py ─▶ experiments.db
GET /history  ─▶ route ─▶ Repository ─▶ experiments.py ─▶ experiments.db
GET /models   ─▶ route ─▶ Repository ─▶ experiments.py ─▶ experiments.db
```

Every SQL statement in the project lives in two files. Next lesson: **SQLAlchemy**, the library most Python services use instead of writing SQL by hand. It writes the SQL for you, and you'll make it show you every statement, so it's never a black box.
