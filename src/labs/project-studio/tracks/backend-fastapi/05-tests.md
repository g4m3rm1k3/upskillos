---
title: 5 — Test hostile input and real contention
track: Backend Developer Bootcamp — FastAPI — Equipment Booking
trackOrder: 51.01
runtime: none
---

Outcome: test observable HTTP behavior, domain failures and concurrent writes. The fixture owns an isolated database; test order must not affect results.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Build the regression suite

The context-managed TestClient runs application lifespan. The ownership test authenticates two different principals; testing only anonymous requests cannot establish object authorization. The response-key assertion protects the public DTO. The race test uses two separate database connections and checks persisted state after both finish.

These fixtures use named test-only credentials in temporary databases. They must never seed a deployed environment. Unit tests isolate policy; integration tests exercise the real persistence and HTTP adapters. Do not mock away the unique constraint you are trying to prove.

Run `python -m pytest -q`. Expected: all named tests pass. Read [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/) for the in-process client model.

```python file=test_booking.py
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
import sqlite3
import pytest
from fastapi.testclient import TestClient
from main import create_app
from domain import validate_day
import store

DAY = (date.today() + timedelta(days=1)).isoformat()

@pytest.fixture
def client(tmp_path):
    path = str(tmp_path / "test.db")
    with TestClient(create_app(path)) as c:
        store.issue(path, "alice-test-token", "alice")
        store.issue(path, "bob-test-token", "bob")
        store.issue(path, "expired", "alice", seconds=-1)
        yield c

def auth(name="alice"):
    return {"Authorization": f"Bearer {name}-test-token"}

def test_domain():
    with pytest.raises(ValueError):
        validate_day("2000-01-01")
    with pytest.raises(ValueError):
        validate_day("not-a-date")

def test_authorization_and_conflict(client):
    body = {"equipment": "camera", "day": DAY}
    assert client.post("/bookings", json=body).status_code == 401
    assert client.post("/bookings", json=body, headers={"Authorization":"Bearer expired"}).status_code == 401
    first = client.post("/bookings", json=body, headers=auth())
    assert first.status_code == 201
    assert set(first.json()) == {"id", "equipment", "day"}
    url = f"/bookings/{first.json()['id']}"
    assert client.get(url, headers=auth()).status_code == 200
    assert client.get(url, headers=auth("bob")).status_code == 404
    assert client.post("/bookings", json=body, headers=auth("bob")).status_code == 409

def test_mass_assignment_and_bad_input(client):
    for body in [
        {"equipment":"camera", "day":DAY, "owner":"bob"},
        {"equipment":"../../secret", "day":DAY},
        {"equipment":"camera", "day":"2000-01-01"},
    ]:
        assert client.post("/bookings", json=body, headers=auth()).status_code == 422

def test_race_and_persistence(tmp_path):
    path = str(tmp_path / "race.db")
    store.initialize(path)
    def attempt(owner):
        try:
            store.reserve(path, owner, "camera", DAY)
            return "created"
        except sqlite3.IntegrityError:
            return "conflict"
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(attempt, ["alice", "bob"])) == ["conflict", "created"]
    with store.connect(path) as db:
        assert db.execute("SELECT count(*) FROM bookings").fetchone()[0] == 1
```


```predict
question: Do two anonymous-request tests establish ownership isolation?
choice: No
choice: Yes
answer: No
explain: Only different authenticated owners can expose an object-level access bug.
```

## Distinguish failure classes

400/422 means the request cannot satisfy the contract, 401 means no valid identity, 404 means the requested representation is unavailable under this policy, 409 means a valid request conflicts with current state, and 500 means an unexpected server failure. Retrying all failures is harmful. A retry of POST after a lost response is ambiguous unless you design an idempotency contract.

## Your turn: prove a security regression is caught

Temporarily remove `AND owner=?` and its matching parameter from the owned query. The cross-owner test must fail. Restore it. Then add tests for an unknown id, malformed credential and a valid but missing equipment field. Record which layer rejects each.

Write your evidence in `evidence/tests.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/tests.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Run the regression suite

The automatic check selects the project's virtual-environment interpreter explicitly: Project Studio translates `.venv/Scripts/python` to `.venv/bin/python` on macOS/Linux. Activating an interactive terminal does not change the separate check process. Run from this project’s root with its tools installed. A nonzero exit means stop and read the first failure. These are finite tests; no manually running server is required.

```check
run ".venv/Scripts/python -m pytest -q"
```

## Diagnose, explain and review

If the race test passes with the uniqueness rule removed, your test did not create the intended schedule. Assert final row counts, not only response codes.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
