---
title: 6.5 — Defence in Depth: Limits, Origins, Headers and Secrets
track: Authentication and Security — Multi-user Studio
runtime: none
concepts: web-security
revisits: authentication, http, configuration, testing
lab: 31
problem: Nothing is injected in these attacks. The service is used exactly as designed (asked to check passwords, sent requests with a valid cookie), just by the wrong party or far too often. What stops that?
---

The last three lessons fixed bugs. This one adds **layers**: protections that matter even when the code has no bug, because they limit the damage when something else goes wrong. That's **defence in depth**.

> **Defence in depth**: several independent protections, so that one failing doesn't expose everything. Each layer assumes the others might fail.
>
> *Picture it as* guarding on a machine plus a light curtain plus an e-stop plus training. Any one of them should prevent an injury; you have all of them because one day one of them won't.

There's also a bug to fix first: the one lesson 6.4 asked you to hold in mind.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_defence.py provided
# Tests for logout, rate limiting, cross-site requests, headers and secrets. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_defence.py
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ANA = {"email": "ana@example.com", "password": "correct horse battery"}
WRONG = {**ANA, "password": "not the right password"}


@pytest.fixture
def app_module(tmp_path, monkeypatch):
    monkeypatch.setenv("STUDIO_DB", str(tmp_path / "studio.db"))
    import app
    getattr(app, "failed_logins", {}).clear()
    return app


def client_for(app_module):
    return TestClient(app_module.app, base_url="https://testserver")


def test_logout_ends_the_session_on_the_server(app_module):
    ana = client_for(app_module)
    ana.post("/register", json=ANA)
    ana.post("/login", json=ANA)
    stolen = ana.cookies["session"]
    ana.post("/logout")
    thief = client_for(app_module)
    thief.cookies.set("session", stolen)
    assert thief.get("/me").status_code == 401, "a copied token still works after logout"


def test_limit_blocks_guessing_after_five_failures(app_module):
    client = client_for(app_module)
    client.post("/register", json=ANA)
    codes = [client.post("/login", json=WRONG).status_code for _ in range(6)]
    assert codes == [401, 401, 401, 401, 401, 429]
    assert client.post("/login", json=ANA).status_code == 429, "even the right password waits"


def test_limit_is_per_account(app_module):
    client = client_for(app_module)
    client.post("/register", json=ANA)
    for _ in range(5):
        client.post("/login", json=WRONG)
    other = {"email": "bo@example.com", "password": "another long password"}
    client.post("/register", json=other)
    assert client.post("/login", json=other).status_code == 200


def test_origin_another_site_cannot_post(app_module):
    client = client_for(app_module)
    response = client.post("/register", json=ANA, headers={"Origin": "https://evil.example"})
    assert response.status_code == 403


def test_origin_this_site_and_no_origin_are_fine(app_module):
    client = client_for(app_module)
    assert client.post("/register", json=ANA, headers={"Origin": "http://127.0.0.1:8000"}).status_code == 201
    assert client.post("/login", json=ANA).status_code == 200


def test_headers_on_every_response(app_module):
    response = client_for(app_module).get("/me")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Content-Security-Policy"] == "default-src 'self'"


def test_secrets_are_kept_out_of_git():
    ignored = Path(".gitignore").read_text(encoding="utf-8").splitlines()
    for name in ["secret.env", "*.db", ".venv/"]:
        assert name in ignored
```

`ana.cookies["session"]` reads the cookie the test client stored, and `thief.cookies.set(...)` puts a copy into another client: exactly what an attacker does with a stolen token. `getattr(app, "failed_logins", {}).clear()` resets the rate limiter between tests; `getattr` with a default means the line works before `failed_logins` exists.

Run the first test now:

```powershell
.venv\Scripts\python -m pytest -q tests/test_defence.py -k logout
```

```text
E       AssertionError: a copied token still works after logout
```

```check
file tests/test_defence.py -- Click "Create provided tests/test_defence.py" above.
run ".venv/Scripts/python -m pytest -q tests/test_defence.py -k logout" exit=1 stdout="a copied token still works after logout" label="the copied token survives logout (red)"
```

## A logout that really logs out

Lesson 6.4 moved `logout` into the new `app.py`, and its parameter became `session: str | None = None`, without `Cookie()`. To FastAPI, a plain parameter like that is a **query parameter** (`/logout?session=…`). Browsers send the session in a cookie, not in the URL, so `session` was always `None`, `end_session` never ran, and logout only deleted the browser's copy of the cookie. The token stayed valid on the server for its full 8 hours.

Every test passed, because lesson 6.2's logout test only checked the browser's side: after logout, *that* client's next request had no cookie. This new test checks the server's side, from an attacker's point of view. Bugs like this are found by asking "what would an attacker do?", not "does the happy path work?".

Update `app.py` (`Cookie` is back in the import line, and in `logout`'s signature):

```python file=app.py
import sqlite3
from typing import Annotated

from fastapi import Cookie, FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

import accounts
import explore
import projects
from deps import Connection, User

app = FastAPI(title="ML Studio accounts")
app.include_router(explore.router)


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=200)


class NewProject(BaseModel):
    name: str = Field(min_length=1, max_length=100)


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

```check
run ".venv/Scripts/python -m pytest -q tests/test_defence.py -k logout" label="logout now ends the session on the server: the copied token stops working (green)"
```

## Slow down guessing: rate limiting

Lesson 6.1 made each guess *against a stolen database* slow. Guessing through the login form is a different attack: an attacker's program can post thousands of logins a minute, and with no limit it will eventually try "sunshine2024".

> **Rate limiting**: refusing requests from a source once it has made too many in a time window, usually with status **429 Too Many Requests**.
>
> *Picture it as* a keypad lock that locks out for 15 minutes after five wrong codes. The right code still works, just not until the lockout ends, so guessing all 10,000 four-digit codes goes from minutes to months.

Update `app.py`:

```python file=app.py
import sqlite3
import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Cookie, FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

import accounts
import explore
import projects
from deps import Connection, User

LOGIN_LIMIT, LOGIN_WINDOW = 5, 15 * 60   # five failures per account in fifteen minutes

app = FastAPI(title="ML Studio accounts")
app.include_router(explore.router)
failed_logins: dict[str, deque] = defaultdict(deque)


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=200)


class NewProject(BaseModel):
    name: str = Field(min_length=1, max_length=100)


def too_many_failures(email: str) -> bool:
    recent = failed_logins[email]
    while recent and recent[0] < time.monotonic() - LOGIN_WINDOW:
        recent.popleft()
    return len(recent) >= LOGIN_LIMIT


@app.post("/register", status_code=201)
def register(credentials: Credentials, connection: Connection) -> dict:
    try:
        user_id = accounts.add_user(connection, credentials.email, credentials.password)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="that email is already registered") from None
    return {"id": user_id}


@app.post("/login")
def login(credentials: Credentials, response: Response, connection: Connection) -> dict:
    email = credentials.email.strip().lower()
    if too_many_failures(email):
        raise HTTPException(status_code=429, detail="too many failed logins; try again later")
    user_id = accounts.check_login(connection, email, credentials.password)
    if user_id is None:
        failed_logins[email].append(time.monotonic())
        raise HTTPException(status_code=401, detail="wrong email or password")
    failed_logins.pop(email, None)
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

How the limiter works, with two new standard-library tools:

- **`defaultdict(deque)`**: a dictionary that creates a missing value on first use. `failed_logins["ana@example.com"]` gives an empty **deque** the first time instead of raising `KeyError`. A deque ("deck") is a list that's fast to add to at one end and remove from at the other: the failure times, oldest first.
- **`too_many_failures`** first throws away failures older than the window (`popleft` removes from the old end, while the oldest is too old), then counts what's left.
- **`time.monotonic()`**: a clock that only ever goes forward. The wall clock can jump when the computer's time is corrected or daylight saving changes; a monotonic clock can't, so it's the right clock for measuring intervals.
- **The check comes before the password is checked**, so a locked-out account costs no scrypt work at all, and **even the right password gets 429** while the lock lasts. Otherwise the attacker could keep guessing and simply watch for a response that isn't 429.
- **Per account**, so one person's lockout doesn't affect anyone else.

This limiter lives in the server's memory: it forgets everything on restart, and if the service ran as several processes, each would count separately. Production services keep these counters in a shared store such as Redis; the logic is the same.

```predict
question: An attacker can make 5 guesses per account every 15 minutes. How many days to try a list of 10,000 likely passwords against one account? (round to the nearest day)
answer: 21
explain: 10,000 guesses ÷ 5 per window = 2,000 windows; 2,000 × 15 minutes = 30,000 minutes = 500 hours ≈ 20.8 days. Without the limit, a program could try the same list in minutes. Combined with a 12-character minimum (lesson 6.1), and the owner probably noticing, the form stops being a practical way in. That's defence in depth: the slow hash protects a stolen database; the limit protects the live form.
tolerance: 1
verify: .venv/Scripts/python -c "print(round(10000 / 5 * 15 / 60 / 24))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_defence.py -k limit" label="the sixth wrong guess gets 429, even the right password waits, and other accounts aren't affected"
```

## Requests from other sites, and security headers

Two more layers, added for **every** request at once, in one place.

**Cross-site request forgery.** Ana is logged in to your service in one tab. In another tab she visits a malicious page, which contains a hidden form that posts to *your* `/projects`. Her browser sends the request, and attaches her session cookie automatically, because cookies go with every request to their site, whoever triggered it.

> **CSRF** (cross-site request forgery): another website making a victim's browser send a request to your site, carrying the victim's cookies, so your site believes the victim asked for it.
>
> *Picture it as* someone slipping a forged work order into a supervisor's tray: it's on the right paper, in the right tray, and gets actioned because of *where* it arrived, not who wrote it.

`SameSite=lax` (lesson 6.2) already stops modern browsers attaching the cookie to a cross-site POST. The second layer: browsers put an **`Origin`** header on POST requests saying which site the page came from, and they don't let pages fake it. So the server can refuse state-changing requests whose `Origin` isn't its own. (Requests with no `Origin` at all, like the test client's or a script's, aren't from a browser page, and carry no victim's cookie to abuse.)

**Security headers** tell the browser to be stricter with your pages:

| Header | Tells the browser |
|---|---|
| `X-Content-Type-Options: nosniff` | trust the `Content-Type` I send; don't guess. (A browser that "sniffs" an uploaded `.txt` file and decides it's HTML could run a script hidden in it.) |
| `X-Frame-Options: DENY` | never show my pages inside another site's frame. (Stops **clickjacking**: an invisible copy of your page laid over a decoy button.) |
| `Content-Security-Policy: default-src 'self'` | only load scripts, styles and images from my own site. (If an XSS bug slips through, injected `<script src="https://evil…">` is refused.) |

Both go in a **middleware**:

> **Middleware**: code that runs around **every** request: before the route sees it, and after the route has produced a response.
>
> *Picture it as* the gatehouse every vehicle passes on the way in and out of the site, whichever building it's visiting. One gatehouse, not a check at every door.

Update `app.py`:

```python file=app.py
import os
import sqlite3
import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Cookie, FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import accounts
import explore
import projects
from deps import Connection, User

LOGIN_LIMIT, LOGIN_WINDOW = 5, 15 * 60   # five failures per account in fifteen minutes
ALLOWED_ORIGINS = set(os.environ.get("STUDIO_ORIGINS", "http://127.0.0.1:8000").split(","))

app = FastAPI(title="ML Studio accounts")
app.include_router(explore.router)
failed_logins: dict[str, deque] = defaultdict(deque)


@app.middleware("http")
async def protect(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and origin is not None and origin not in ALLOWED_ORIGINS:
        return JSONResponse({"detail": "cross-site request refused"}, status_code=403)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=200)


class NewProject(BaseModel):
    name: str = Field(min_length=1, max_length=100)


def too_many_failures(email: str) -> bool:
    recent = failed_logins[email]
    while recent and recent[0] < time.monotonic() - LOGIN_WINDOW:
        recent.popleft()
    return len(recent) >= LOGIN_LIMIT


@app.post("/register", status_code=201)
def register(credentials: Credentials, connection: Connection) -> dict:
    try:
        user_id = accounts.add_user(connection, credentials.email, credentials.password)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="that email is already registered") from None
    return {"id": user_id}


@app.post("/login")
def login(credentials: Credentials, response: Response, connection: Connection) -> dict:
    email = credentials.email.strip().lower()
    if too_many_failures(email):
        raise HTTPException(status_code=429, detail="too many failed logins; try again later")
    user_id = accounts.check_login(connection, email, credentials.password)
    if user_id is None:
        failed_logins[email].append(time.monotonic())
        raise HTTPException(status_code=401, detail="wrong email or password")
    failed_logins.pop(email, None)
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

- **`@app.middleware("http")`** registers `protect` to run for every HTTP request. It's `async def` because FastAPI's middleware is built on Python's **asynchronous** machinery; for this lesson, read `async def` as "a function FastAPI can pause while it waits", and `await call_next(request)` as "now let the route (and everything after) handle the request, and give me its response".
- **Before** `call_next`: a state-changing method (`POST`, `PUT`, `PATCH`, `DELETE`) from a foreign `Origin` gets 403 and **never reaches a route**.
- **After** `call_next`: the three headers are added to every response, errors included.
- **`ALLOWED_ORIGINS`** comes from an environment variable, with your local address as the default: in production it's set to the real site's address. Configuration, not code (lesson 0.5).

```check
run ".venv/Scripts/python -m pytest -q tests/test_defence.py -k \"origin or headers\"" label="foreign-origin POSTs are refused, and every response carries the security headers"
```

## Secrets stay out of the code

The last layer is about what's in your project folder. `secret.env` holds a secret (in a real project: a database password, an API key, the key that signs cookies). `studio.db` holds every user's email and password hash. Neither must ever be committed to Git: a repository is copied to every developer's machine, every backup, and often, by mistake, somewhere public. Bots scan public repositories for leaked keys within minutes of a push.

> **Secret**: any value that grants access: passwords, API keys, signing keys, database credentials. Secrets are given to a program at run time (environment variables, or a secrets manager on the hosting platform), never written into the code or committed.
>
> *Picture it as* the key to the stores: it's issued to a person on shift, not taped to the door with the instructions.

Create `.gitignore`:

```text file=.gitignore
.venv/
__pycache__/
.pytest_cache/
*.db
secret.env
```

`*.db` matches every database file in the folder. If a secret is ever committed anyway, deleting it in a later commit isn't enough: it's still in the history. The fix is to **change the secret** (rotate it), so the leaked copy is worthless.

```check
run ".venv/Scripts/python -m pytest -q tests/test_defence.py" label="every defence test passes, including secrets kept out of Git"
run ".venv/Scripts/python -m pytest -q" label="every test in the chapter passes: the features work and every attack fails"
```

### Chapter 6: what you built, and the attack each piece stops

| Piece | The attack it stops |
|---|---|
| scrypt, salted, constant-time comparison | cracking passwords from a stolen database |
| Same answer and same time for "no such user" and "wrong password" | finding out which emails have accounts |
| Random session tokens, stored as fingerprints, expiring, cancelled at logout | guessing, reusing or stealing a login |
| `HttpOnly`, `Secure`, `SameSite` cookies | scripts reading the token, network snooping, cross-site requests |
| `AND owner_id = ?` in every query | reading other people's data by changing an id (IDOR) |
| `?` placeholders | SQL injection |
| Escaping templates | cross-site scripting |
| Resolve, then check the destination | path traversal |
| Rate limiting | guessing passwords through the login form |
| `Origin` check | cross-site request forgery |
| Security headers | content sniffing, clickjacking, injected external scripts |
| `.gitignore` and environment variables | secrets and data leaking through the repository |

Security wasn't a feature added at the end: every one of these fixes is a line or two, and every attack was a line or two, too. The habit to keep is the one you practised five times: for every input, ask "what if someone hostile chose this?", and write that as a test.

The studio has accounts, projects and a database, and it's reasonably safe. What it doesn't have yet is more than one kind of model. Before adding more, the next chapter asks a question this series has postponed since lesson 3.3: **how do you know a model is actually good?**
