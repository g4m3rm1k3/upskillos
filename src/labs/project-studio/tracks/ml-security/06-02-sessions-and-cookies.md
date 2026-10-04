---
title: 6.2 — Staying Logged In: Sessions and Cookies
track: Authentication and Security — Multi-user Studio
runtime: none
concepts: authentication
revisits: http, web-api, sql, testing
lab: 31
problem: HTTP forgets everything between requests, so after logging in, the very next request is anonymous again. How does the service know who's asking, on every request, without asking for the password every time?
---

Lesson 4.1 said it: every HTTP request stands alone. The login route checked Ana's password and answered 200, and then forgot her. Sending the password with every request would work, and would mean the password travels, and is checked with a deliberately slow scrypt, hundreds of times an hour.

The standard answer: when the password is right, the server issues a **session token**, a long random string, and the browser sends it back with every later request. The server looks the token up to find who's asking. The token travels in a **cookie**.

> **Session**: a record on the server that says "whoever presents token X is user 7, until this time". **Session token**: the random, unguessable string that identifies the session. Holding the token *is* being logged in, so it must be as hard to guess as a password and protected like one.
>
> *Picture it as* a visitor's day badge at reception. You prove who you are once, with ID, at the desk (the password); you get a numbered badge (the token); for the rest of the day, doors check the badge, not your ID. It expires at the end of the day, and handing it in at the exit (logout) cancels it.

> **Cookie**: a small named value a server asks the browser to store (with the `Set-Cookie` response header), which the browser then sends back automatically (in the `Cookie` request header) with every request to that server.
>
> *Picture it as* the badge clipped to your jacket: you don't have to remember to show it; it's presented at every door you walk through. **Where the picture stops working:** the browser presents it at *every* request to that site, including ones another site tricked it into making. Lesson 6.5 deals with that.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_sessions.py provided
# Tests for sessions in accounts.py and app.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_sessions.py
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

ANA = {"email": "ana@example.com", "password": "correct horse battery"}


@pytest.fixture
def connection():
    import accounts, db
    connection = db.connect(":memory:")
    accounts.add_user(connection, ANA["email"], ANA["password"])
    return connection


def test_token_is_long_and_different_every_time(connection):
    import accounts
    first, second = accounts.start_session(connection, 1), accounts.start_session(connection, 1)
    assert first != second
    assert len(first) >= 40


def test_token_is_stored_only_as_a_fingerprint(connection):
    import accounts
    token = accounts.start_session(connection, 1)
    stored = connection.execute("SELECT token_hash FROM sessions").fetchone()[0]
    assert stored != token and token not in stored
    assert len(stored) == 64


def test_token_finds_its_user_and_a_forgery_finds_nobody(connection):
    import accounts
    token = accounts.start_session(connection, 1)
    assert accounts.user_for(connection, token) == 1
    assert accounts.user_for(connection, token + "x") is None


def test_token_stops_working_when_it_expires(connection, monkeypatch):
    import accounts
    monkeypatch.setattr(accounts, "SESSION_LENGTH", timedelta(seconds=-1))
    token = accounts.start_session(connection, 1)
    assert accounts.user_for(connection, token) is None


def test_token_stops_working_after_logout(connection):
    import accounts
    token = accounts.start_session(connection, 1)
    accounts.end_session(connection, token)
    assert accounts.user_for(connection, token) is None


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("STUDIO_DB", str(tmp_path / "studio.db"))
    import app
    with TestClient(app.app, base_url="https://testserver") as client:
        client.post("/register", json=ANA)
        yield client


def test_cookie_is_set_at_login_and_locked_down(client):
    cookie = client.post("/login", json=ANA).headers["set-cookie"]
    assert cookie.startswith("session=")
    for flag in ["HttpOnly", "Secure", "SameSite=lax"]:
        assert flag in cookie


def test_cookie_unlocks_the_me_route(client):
    assert client.get("/me").status_code == 401
    client.post("/login", json=ANA)
    assert client.get("/me").json() == {"id": 1}


def test_cookie_logout_locks_it_again(client):
    client.post("/login", json=ANA)
    client.post("/logout")
    assert client.get("/me").status_code == 401


def test_cookie_is_never_sent_back_over_plain_http(tmp_path, monkeypatch):
    monkeypatch.setenv("STUDIO_DB", str(tmp_path / "plain.db"))
    import app
    with TestClient(app.app, base_url="http://testserver") as plain:
        plain.post("/register", json=ANA)
        assert plain.post("/login", json=ANA).status_code == 200
        assert plain.get("/me").status_code == 401, "a Secure cookie stays in the browser on plain HTTP"
```

- **`monkeypatch.setattr(accounts, "SESSION_LENGTH", timedelta(seconds=-1))`** replaces a module's variable for one test: every session that test starts has already expired. Testing expiry without waiting 8 hours.
- **The test client stores cookies like a browser.** After `client.post("/login", …)`, the client keeps the `session` cookie and sends it with every later request, so `client.get("/me")` is "the same visitor, logged in".
- **The last test** logs in over plain `http://`, and the cookie is then *not* sent back. That's not a bug; it's the `Secure` flag doing its job, explained below.

```check
file tests/test_sessions.py -- Click "Create provided tests/test_sessions.py" above.
```

## Session tokens

Add the session functions to `accounts.py`:

```python file=accounts.py
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import passwords

SESSION_LENGTH = timedelta(hours=8)
NOBODY = passwords.hash_password("a password no account has")


def add_user(connection, email: str, password: str) -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (email.strip().lower(), passwords.hash_password(password)),
        )
    return cursor.lastrowid


def check_login(connection, email: str, password: str) -> int | None:
    row = connection.execute(
        "SELECT id, password_hash FROM users WHERE email = ?", (email.strip().lower(),)
    ).fetchone()
    if row is None:
        passwords.verify_password(password, NOBODY)
        return None
    return row["id"] if passwords.verify_password(password, row["password_hash"]) else None


def now() -> datetime:
    return datetime.now(timezone.utc)


def fingerprint(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def start_session(connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (fingerprint(token), user_id, (now() + SESSION_LENGTH).isoformat()),
        )
    return token


def user_for(connection, token: str) -> int | None:
    row = connection.execute(
        "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?",
        (fingerprint(token), now().isoformat()),
    ).fetchone()
    return None if row is None else row["user_id"]


def end_session(connection, token: str) -> None:
    with connection:
        connection.execute("DELETE FROM sessions WHERE token_hash = ?", (fingerprint(token),))
```

- **`secrets.token_urlsafe(32)`**: 32 random bytes (256 bits), written with only letters, digits, `-` and `_`, so it's safe in a cookie or URL. That's 43 characters. Guessing it is hopeless: there are more possible tokens than atoms in the observable universe, many times over.
- **The database stores `fingerprint(token)`**, a SHA-256 hash, never the token itself. The same logic as passwords: if the sessions table leaks, the attacker can't log in with what's in it. Why is a **fast** hash fine here, when lesson 6.1 said fast hashes are wrong for passwords? Because the token is 256 random bits, not something a person chose: there's no list of likely tokens to try, so speed doesn't help the attacker.
- **`expires_at`** is the time plus 8 hours, and `user_for` only accepts sessions whose `expires_at` is still later than now. Comparing the times as **ISO 8601 text** works because the format puts the largest unit first (lesson 5.1), so text order is time order.
- **`end_session`** deletes the session row: after logout, the token matches nothing.

```check
run ".venv/Scripts/python -m pytest -q tests/test_sessions.py -k token" label="tokens are random, stored only as fingerprints, expire, and stop working after logout"
```

## The cookie, and who's asking

Update `app.py`: login sets the cookie, a dependency reads it on every request, and two new routes use it:

```python file=app.py
import os
import sqlite3
from typing import Annotated

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

import accounts
import db

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
```

**Setting the cookie.** A route can take a `response: Response` parameter, and FastAPI hands it the response it's about to send, so the route can add headers. `response.set_cookie(...)` adds a `Set-Cookie` header:

```text
set-cookie: session=GcZK30-8x0c_h…; HttpOnly; Max-Age=28800; Path=/; SameSite=lax; Secure
```

Each flag closes a different hole:

| Flag | Means | Without it |
|---|---|---|
| `HttpOnly` | JavaScript running on the page can't read this cookie | a script injected into the page (lesson 6.4) reads the token and sends it to the attacker |
| `Secure` | the browser only sends it over **HTTPS** (encrypted) | anyone on the same network (a café's Wi-Fi) can read it off the wire |
| `SameSite=lax` | not sent with requests that another site triggers, except plain link-following | another site can make your browser send requests carrying your login (lesson 6.5) |
| `Max-Age=28800` | the browser discards it after 8 hours, matching the server's expiry | it lives as long as the browser decides |

> **HTTPS**: HTTP sent through an encrypted connection (TLS), so nobody between the browser and the server can read or alter it, and the browser can check it's really talking to the right server. The `S` is for secure.
>
> *Picture it as* sending documents in a locked case instead of an open envelope. HTTP's text (lesson 4.1's raw request) is readable by every machine it passes through; HTTPS isn't.

That's why the tests use `base_url="https://testserver"`, and why the last test, on plain `http://`, never gets the cookie back. Your browser treats `http://127.0.0.1` specially as a "secure context" for development, so logging in through `/docs` locally still works.

**Reading the cookie.** `session: Annotated[str | None, Cookie()] = None` tells FastAPI to take the value of the cookie named `session` (the parameter's name) from the request, or `None` if there isn't one. `current_user` turns it into a user id or raises 401.

**Protecting a route** is now one parameter: `def me(user: User)`. `User` is `Annotated[int, Depends(current_user)]`, so FastAPI runs `current_user` first; if that raises 401, the route never runs. Every route that takes `user: User` is protected, and a route that forgets to take it isn't. That's worth remembering for the next lesson.

**Logging out** ends the session on the server *and* tells the browser to delete the cookie (`delete_cookie` sends a `Set-Cookie` that's already expired). Deleting only the cookie wouldn't be enough: anyone who had copied the token could still use it. The server's record is what counts.

```predict
question: Someone copies Ana's session cookie value. Ana then logs out. Can the copy still be used?
choice: Yes, until the cookie's Max-Age runs out
choice: No: logout deleted the session on the server, so the token matches nothing
choice: Yes, because the copy is a different cookie from Ana's
answer: No: logout deleted the session on the server, so the token matches nothing
explain: The cookie is just a carrier for the token; what makes a token work is the matching row in the sessions table. logout calls end_session, which deletes that row, so every copy of the token, anywhere, now finds nobody in user_for. That's the advantage of server-side sessions: they can be cancelled. (Some systems use self-contained signed tokens with no server record instead; those can't be cancelled before they expire, which is their main trade-off.)
```

Try it in the browser: run `.venv\Scripts\python -m uvicorn app:app --reload`, open `/docs`, register, log in, then call `/me` (it answers with your id), `/logout`, and `/me` again (401).

```check
run ".venv/Scripts/python -m pytest -q tests/test_sessions.py" label="login sets a locked-down cookie, /me needs it, logout cancels it, and it never travels over plain HTTP" -- set_cookie("session", token, httponly=True, secure=True, samesite="lax", max_age=...)
run ".venv/Scripts/python -m pytest -q" label="every earlier test still passes"
```
