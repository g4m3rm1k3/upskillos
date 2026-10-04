---
title: 6.3 — Yours, Not Theirs: Authorisation
track: Authentication and Security — Multi-user Studio
runtime: none
concepts: authentication, web-security
revisits: sql, web-api, testing
lab: 31
problem: The service knows who's asking. It still has to decide, on every request, whether that person may see what they asked for. What happens when one route forgets to ask?
---

Each user now gets **projects**: a named place for their datasets, models and experiments (the next chapters fill them). Ana's projects are Ana's. The service knows who's asking (lesson 6.2), so this should be easy: show people their own projects.

You'll write it the way it's most often written first, attack it, and fix it. The attack is the most common serious security bug in web applications, consistently at or near the top of industry lists of real-world vulnerabilities, and it needs no special tools: just changing a number in a URL.

> **Authorisation**: deciding whether *this* user may perform *this* action on *this* thing. It has to be checked on every request, for every object, on the server.
>
> *Picture it as* the crib attendant from lesson 6.1, checking the sign-out sheet against your badge for each tool you ask for, every time, even though you're obviously allowed in the building.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_projects.py provided
# Tests for projects.py and the project routes. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_projects.py
import pytest
from fastapi.testclient import TestClient

ANA = {"email": "ana@example.com", "password": "correct horse battery"}
BO = {"email": "bo@example.com", "password": "another long password"}


@pytest.fixture
def app_module(tmp_path, monkeypatch):
    monkeypatch.setenv("STUDIO_DB", str(tmp_path / "studio.db"))
    import app
    return app


def logged_in(app_module, credentials):
    client = TestClient(app_module.app, base_url="https://testserver")
    client.post("/register", json=credentials)
    client.post("/login", json=credentials)
    return client


def test_owner_creates_and_lists_their_projects(app_module):
    ana = logged_in(app_module, ANA)
    assert ana.post("/projects", json={"name": "house prices"}).json() == {"id": 1}
    assert ana.get("/projects").json() == [{"id": 1, "name": "house prices"}]
    assert ana.get("/projects/1").json() == {"id": 1, "name": "house prices"}


def test_owner_list_never_includes_other_peoples_projects(app_module):
    ana, bo = logged_in(app_module, ANA), logged_in(app_module, BO)
    ana.post("/projects", json={"name": "ana's model"})
    assert bo.get("/projects").json() == []


def test_owner_routes_need_a_login(app_module):
    anonymous = TestClient(app_module.app, base_url="https://testserver")
    assert anonymous.get("/projects").status_code == 401
    assert anonymous.post("/projects", json={"name": "x"}).status_code == 401


def test_attack_reading_someone_elses_project_by_its_number(app_module):
    ana, bo = logged_in(app_module, ANA), logged_in(app_module, BO)
    project_id = ana.post("/projects", json={"name": "secret pricing model"}).json()["id"]
    response = bo.get(f"/projects/{project_id}")
    assert response.status_code == 404, f"Bo read Ana's project: {response.json()}"


def test_attack_another_users_project_looks_exactly_like_a_missing_one(app_module):
    ana, bo = logged_in(app_module, ANA), logged_in(app_module, BO)
    ana.post("/projects", json={"name": "secret pricing model"})
    assert bo.get("/projects/1").json() == bo.get("/projects/999").json()
```

`logged_in` makes a separate test client per person. Each keeps its own cookies, like two different browsers, so `ana` and `bo` are two people using the service at once. Every `test_attack_…` test is written **from the attacker's side**: it does what an attacker would do and asserts that it **fails**.

```check
file tests/test_projects.py -- Click "Create provided tests/test_projects.py" above.
```

## Projects, the first way

Create `projects.py`. The `get` function here is the version most people write first:

```python file=projects.py
def add(connection, owner_id: int, name: str) -> int:
    with connection:
        cursor = connection.execute("INSERT INTO projects (owner_id, name) VALUES (?, ?)", (owner_id, name))
    return cursor.lastrowid


def list_for(connection, owner_id: int) -> list[dict]:
    rows = connection.execute("SELECT id, name FROM projects WHERE owner_id = ? ORDER BY id", (owner_id,)).fetchall()
    return [dict(row) for row in rows]


def get(connection, owner_id: int, project_id: int) -> dict | None:
    row = connection.execute("SELECT id, name FROM projects WHERE id = ?", (project_id,)).fetchone()
    return None if row is None else dict(row)
```

It looks fine. `add` records the owner. `list_for` only lists the owner's projects. And `get` takes the owner's id as a parameter, so the route can't forget to pass it.

```check
file projects.py
```

## The project routes

Update `app.py`:

```python file=app.py
import os
import sqlite3
from typing import Annotated

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

import accounts
import db
import projects

app = FastAPI(title="ML Studio accounts")


def get_connection():
    connection = db.connect(os.environ.get("STUDIO_DB", "studio.db"))
    try:
        yield connection
    finally:
        connection.close()


Connection = Annotated[sqlite3.Connection, Depends(get_connection)]


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=200)


class NewProject(BaseModel):
    name: str = Field(min_length=1, max_length=100)


def current_user(connection: Connection, session: Annotated[str | None, Cookie()] = None) -> int:
    user_id = accounts.user_for(connection, session) if session else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="log in first")
    return user_id


User = Annotated[int, Depends(current_user)]


@app.post("/register", status_code=201)
def register(credentials: Credentials, connection: Connection) -> dict:
    try:
        user_id = accounts.add_user(connection, credentials.email, credentials.password)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="that email is already registered") from None
    return {"id": user_id}


@app.post("/login")
def login(credentials: Credentials, response: Response, connection: Connection) -> dict:
    user_id = accounts.check_login(connection, credentials.email, credentials.password)
    if user_id is None:
        raise HTTPException(status_code=401, detail="wrong email or password")
    token = accounts.start_session(connection, user_id)
    response.set_cookie("session", token, httponly=True, secure=True, samesite="lax",
                        max_age=int(accounts.SESSION_LENGTH.total_seconds()))
    return {"id": user_id}


@app.post("/logout")
def logout(response: Response, connection: Connection, session: Annotated[str | None, Cookie()] = None) -> dict:
    if session:
        accounts.end_session(connection, session)
    response.delete_cookie("session")
    return {"logged_out": True}


@app.get("/me")
def me(user: User) -> dict:
    return {"id": user}


@app.post("/projects", status_code=201)
def create_project(project: NewProject, user: User, connection: Connection) -> dict:
    return {"id": projects.add(connection, user, project.name)}


@app.get("/projects")
def list_projects(user: User, connection: Connection) -> list[dict]:
    return projects.list_for(connection, user)


@app.get("/projects/{project_id}")
def get_project(project_id: int, user: User, connection: Connection) -> dict:
    project = projects.get(connection, user, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="no such project")
    return project
```

**`@app.get("/projects/{project_id}")`** is a **path parameter**: the part of the URL in braces is captured, converted to the parameter's type (`int`), and passed to the function. `/projects/7` calls `get_project(project_id=7, …)`; `/projects/seven` is a 422.

Every project route takes `user: User`, so every one needs a login, and `create_project` records the logged-in user as the owner. Run the tests that don't attack anything:

```powershell
.venv\Scripts\python -m pytest -q tests/test_projects.py -k owner
```

All three pass. Logins are required, lists are private.

```check
run ".venv/Scripts/python -m pytest -q tests/test_projects.py -k owner" label="project routes need a login, and each person's list shows only their projects"
```

## Attack: change the number

Now be Bo. Ana has a project called "secret pricing model". Bo can see his own project URLs, `/projects/2`, `/projects/3`, and project numbers are just counting up. So Bo tries `/projects/1`.

Run the attack tests:

```powershell
.venv\Scripts\python -m pytest -q tests/test_projects.py -k attack
```

```text
E       AssertionError: Bo read Ana's project: {'id': 1, 'name': 'secret pricing model'}
```

```predict
question: Bo is logged in properly, and get_project takes the user. Why does Bo get Ana's project?
choice: Bo's session token was guessed
choice: get() is given Bo's id, but its query never uses it
choice: The route forgot to require a login
answer: get() is given Bo's id, but its query never uses it
explain: Read the SQL: SELECT id, name FROM projects WHERE id = ?. It asks "which project has this number?" and never "…and does it belong to this person?". owner_id is a parameter of the function, which makes the code *look* checked, and is then ignored.

Authentication worked perfectly: the service knows it's Bo. Authorisation was never done. This bug has a name, **IDOR** (insecure direct object reference): an object fetched by an id the user supplied, without checking that the user may have it. Real breaches have exposed millions of records this way, by counting through ids.
```

The test runner shows the attack working. This check expects the attack tests to **fail** right now (exit code 1), because the code is vulnerable:

```check
run ".venv/Scripts/python -m pytest -q tests/test_projects.py -k attack" exit=1 stdout="Bo read Ana's project" label="the attack works against the first version: Bo reads Ana's project (red)"
```

## Fix: ask the database the right question

Update `get` in `projects.py`:

```python file=projects.py
def add(connection, owner_id: int, name: str) -> int:
    with connection:
        cursor = connection.execute("INSERT INTO projects (owner_id, name) VALUES (?, ?)", (owner_id, name))
    return cursor.lastrowid


def list_for(connection, owner_id: int) -> list[dict]:
    rows = connection.execute("SELECT id, name FROM projects WHERE owner_id = ? ORDER BY id", (owner_id,)).fetchall()
    return [dict(row) for row in rows]


def get(connection, owner_id: int, project_id: int) -> dict | None:
    row = connection.execute(
        "SELECT id, name FROM projects WHERE id = ? AND owner_id = ?", (project_id, owner_id)
    ).fetchone()
    return None if row is None else dict(row)
```

One condition: `AND owner_id = ?`. Now the question asked of the database is "the project with this number **that belongs to this person**". Someone else's project and a project that doesn't exist give the same answer: no row, so `None`, so 404.

Notice where the check went: into the query, in the data-access function, not as an `if` in the route afterwards (`if project["owner_id"] != user: …`). Both work for this route; putting it in the query means **no caller of `get` can forget it**, because there's no way to call `get` that skips it.

```predict
question: Bo asks for Ana's project. Which status should he get?
choice: 403 Forbidden: "that exists, but it isn't yours"
choice: 404 Not Found: "no such project"
answer: 404 Not Found: "no such project"
explain: 403 is honest, and tells Bo that project 1 exists. Counting through 403s and 404s, he can map how many projects there are and which numbers are taken: information he shouldn't have. 404 makes someone else's project indistinguishable from one that doesn't exist, which is what the second attack test checks: the two responses are identical.

403 is right when the user may know the thing exists but not act on it (an admin page shown to a non-admin, say). For other people's private data, the usual choice is 404.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_projects.py" label="the attack fails: other people's projects are indistinguishable from missing ones (green)" -- WHERE id = ? AND owner_id = ?
```

### The rule

Every route that touches a user's data must check, on the server, that **this** user may touch **this** object, and the safest place for the check is the query that fetches it. Requiring a login is necessary and nowhere near sufficient: Bo was logged in.

Next lesson: three attacks where the user's input is treated as **code**: SQL injection, cross-site scripting, and path traversal.
