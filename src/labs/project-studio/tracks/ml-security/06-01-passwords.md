---
title: 6.1 — Who Are You? Storing Passwords
track: Authentication and Security — Multi-user Studio
trackOrder: 26
runtime: none
support: datasets/houses.csv, secret.env
concepts: authentication
revisits: sql, web-api, data-access-layers, testing
lab: 31
problem: Two people now need separate projects, so the service has to know who's asking. That means accounts and passwords, and a stored password is the most valuable thing an attacker can steal. How do you check a password without keeping it?
---

So far the service treats everyone as the same anonymous visitor: anyone can read the whole prediction history. That was fine for one person on one computer. The moment two people use it, each needs their own projects, and the service needs to know **who is asking** before it answers. That's **authentication**.

This chapter builds accounts, logins and per-user projects, and then attacks them. Every security topic follows the same pattern: the version most people write first, the attack that breaks it (you'll run the attack yourself), and the fix. The goal is that you understand *why* each defence exists, so you'd recognise the mistake in code you've never seen.

> **Authentication**: establishing who is making a request ("this is Ana"). **Authorisation**: deciding what that person may do ("Ana may read project 7, Bo may not"). They're different questions, answered by different code, and mixing them up causes real breaches.
>
> *Picture it as* a site badge and a tool crib. The badge at the gate proves who you are (authentication); the crib attendant decides whether *you* may sign out the torque wrench (authorisation). A valid badge doesn't get you every tool.

This lesson is authentication's foundation: passwords, and how to store them so that a stolen database doesn't hand over everyone's password.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `studio-accounts`.
2. `python -m venv .venv`
3. `requirements.txt`: a FastAPI service with HTML pages, as in Chapter 4. Passwords and tokens need nothing new: Python's standard library has the tools.

```text file=requirements.txt
pytest==9.1.1
fastapi==0.142.2
uvicorn==0.54.0
httpx2==2.13.1
jinja2==3.1.6
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import fastapi, jinja2, pytest\"" label="FastAPI, Jinja2 and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates a `datasets` folder and a file `secret.env`, which lesson 6.4 needs.

```python file=tests/test_accounts.py provided
# Tests for passwords.py, db.py, accounts.py and the first routes in app.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_accounts.py
import pytest
from fastapi.testclient import TestClient

ANA = {"email": "ana@example.com", "password": "correct horse battery"}


def test_hash_never_contains_the_password():
    import passwords
    assert "correct horse battery" not in passwords.hash_password("correct horse battery")


def test_hash_is_salted_so_the_same_password_hashes_differently():
    import passwords
    assert passwords.hash_password("same password") != passwords.hash_password("same password")


def test_hash_verifies_the_right_password_only():
    import passwords
    stored = passwords.hash_password("correct horse battery")
    assert passwords.verify_password("correct horse battery", stored)
    assert not passwords.verify_password("correct horse batterY", stored)


def test_user_is_stored_with_a_hash_not_the_password():
    import accounts, db
    connection = db.connect(":memory:")
    accounts.add_user(connection, " Ana@Example.com ", "correct horse battery")
    row = connection.execute("SELECT email, password_hash FROM users").fetchone()
    assert row["email"] == "ana@example.com", "emails are stored trimmed and lower-case"
    assert row["password_hash"].startswith("scrypt$")


def test_user_login_check_accepts_only_the_right_password():
    import accounts, db
    connection = db.connect(":memory:")
    user_id = accounts.add_user(connection, "ana@example.com", "correct horse battery")
    assert accounts.check_login(connection, "ANA@example.com", "correct horse battery") == user_id
    assert accounts.check_login(connection, "ana@example.com", "wrong password here") is None
    assert accounts.check_login(connection, "nobody@example.com", "correct horse battery") is None


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("STUDIO_DB", str(tmp_path / "studio.db"))
    import app
    with TestClient(app.app, base_url="https://testserver") as client:
        yield client


def test_route_register_then_login(client):
    assert client.post("/register", json=ANA).status_code == 201
    assert client.post("/login", json=ANA).status_code == 200


def test_route_register_twice_is_a_conflict(client):
    client.post("/register", json=ANA)
    assert client.post("/register", json=ANA).status_code == 409


def test_route_short_passwords_are_refused(client):
    assert client.post("/register", json={**ANA, "password": "short"}).status_code == 422


def test_route_wrong_password_is_unauthorised(client):
    client.post("/register", json=ANA)
    response = client.post("/login", json={**ANA, "password": "not the right one"})
    assert response.status_code == 401
    assert response.json() == {"detail": "wrong email or password"}
```

Two details to notice now; the lesson explains both:

- `test_hash_is_salted…`: hashing the **same** password twice must give **different** results. If that sounds impossible for a function that "checks passwords", it's the most important idea in this lesson.
- `base_url="https://testserver"`: the test client pretends to talk to the service over HTTPS. Lesson 6.2 explains why login cookies need that.

```check
file tests/test_accounts.py -- Click "Create provided tests/test_accounts.py" above.
file secret.env
```

## The leaked table

Start with how passwords get stolen, because it decides everything else. Databases leak: through a bug, a stolen backup, a misconfigured server, an employee's laptop. Assume yours will one day, and ask: **what does the attacker get?**

If the table stores passwords as typed, they get every password, and people reuse passwords, so they get people's email and bank accounts too. So passwords are never stored. What's stored is a **hash**.

> **Hash function**: a function that turns any input into a fixed-size jumble of bytes (the **hash**, or **digest**), such that the same input always gives the same hash, and there's no practical way to work backwards from the hash to the input. To check a password, hash what the person typed and compare it with the stored hash.
>
> *Picture it as* a fingerprint. You can check whether a person matches a fingerprint on file, but you can't rebuild the person from the fingerprint. **Where the picture stops working:** an attacker with a fingerprint can't produce a person, but an attacker with a password hash *can* try candidate passwords, hash each one, and see which matches. That's the attack below.

Create `crack.py`, which plays the attacker against a leaked table whose passwords were stored with a fast, unsalted hash, SHA-256, as many real systems did:

```python file=crack.py
import hashlib
import time

import passwords

# A "leaked" table: two accounts whose passwords were stored as plain SHA-256 hashes.
LEAKED = {
    "ana@example.com": hashlib.sha256(b"sunshine2024").hexdigest(),
    "bo@example.com": hashlib.sha256(b"dragon!").hexdigest(),
}
WORDS = ["password", "123456", "qwerty", "letmein", "dragon", "monkey", "sunshine", "football", "shadow", "master"]
ENDINGS = ["", "1", "12", "123", "!", "2023", "2024", "2025"]

start = time.perf_counter()
guesses = 0
for email, stored in LEAKED.items():
    for word in WORDS:
        for ending in ENDINGS:
            guesses += 1
            if hashlib.sha256((word + ending).encode()).hexdigest() == stored:
                print(f"cracked {email}: {word + ending}")
fast = (time.perf_counter() - start) / guesses

start = time.perf_counter()
passwords.hash_password("one guess")
slow = time.perf_counter() - start

print(f"{guesses} guesses at about {fast * 1e6:.1f} microseconds each with SHA-256")
print(f"one guess with scrypt takes about {slow * 1000:.0f} milliseconds: {slow / fast:,.0f} times longer")
```

It imports `passwords`, which you write next, so don't run it yet. Read the attack: for every leaked hash, try common words with common endings, hash each guess, and compare. Real attackers do the same with lists of **billions** of leaked real passwords, on graphics cards that compute billions of SHA-256 hashes a second.

```check
file crack.py
```

## Salted, slow hashing

Create `passwords.py`:

```python file=passwords.py
import hashlib
import hmac
import secrets

COST = 2 ** 14   # scrypt's work factor: doubling it doubles the time every guess takes


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = secrets.token_bytes(16) if salt is None else salt
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=COST, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    _, salt_hex, digest_hex = stored.split("$")
    candidate = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt_hex), n=COST, r=8, p=1)
    return hmac.compare_digest(candidate.hex(), digest_hex)
```

Three defences, one per line that matters:

**1. A slow hash: `hashlib.scrypt`.** SHA-256 was designed to be fast, which is exactly wrong for passwords: speed helps the attacker, who makes billions of guesses, far more than you, who check one password at login. **scrypt** is a **key-derivation function** designed to be slow and to need a lot of memory (so graphics cards can't run thousands of guesses side by side). `n=COST` sets how much work each hash takes. About 50 milliseconds is unnoticeable at login and ruinous for an attacker. (`bcrypt` and `Argon2` are the other common choices; scrypt is the one in Python's standard library.)

**2. A salt: `secrets.token_bytes(16)`.**

> **Salt**: random bytes, different for every account, mixed into the password before hashing and stored next to the hash. The same password then gives a different hash for every account.
>
> *Picture it as* a unique serial number stamped into each part before it's weighed: two identical parts no longer weigh identically on paper, so you can't tell that two accounts share a password by comparing their hashes. **Where the picture stops working:** a salt isn't secret (it's stored in plain sight), and it doesn't need to be. Its job is only to make every hash different, so an attacker must attack each account separately, from scratch, instead of hashing a guess once and comparing it with every account at the same time.

`secrets` is the standard library's module for **unpredictable** random values. The `random` module you've used for simulations is designed to be repeatable from a seed, which is precisely what a security token must never be.

**3. A constant-time comparison: `hmac.compare_digest`.** `==` on strings stops at the first character that differs. In principle an attacker measuring response times very precisely can learn how many leading characters matched, one character at a time. `compare_digest` takes the same time however many characters match. It costs nothing, so security code always uses it.

The stored value packs everything needed to check a password later into one string: `scrypt$<salt in hex>$<digest in hex>`. `verify_password` splits it at the `$` signs (`_` is the conventional name for a value you don't use: the algorithm's name), recomputes scrypt with the stored salt, and compares.

Now run the attacker:

```powershell
.venv\Scripts\python crack.py
```

```text
cracked ana@example.com: sunshine2024
cracked bo@example.com: dragon!
160 guesses at about 1.5 microseconds each with SHA-256
one guess with scrypt takes about 55 milliseconds: 35,895 times longer
```

(Your timings will differ; the ratio will be in the tens of thousands.) Both passwords fall in microseconds. With scrypt, the same 160 guesses would take about 9 seconds, and an attacker's list of a billion guesses goes from about 25 minutes to over a year, **per account**, because of the salt.

```check
run ".venv/Scripts/python -m pytest -q tests/test_accounts.py -k test_hash" label="hashes are salted, never contain the password, and verify only the right one" -- secrets.token_bytes(16) for the salt; hmac.compare_digest to compare.
run ".venv/Scripts/python crack.py" stdout="cracked bo@example.com: dragon!" label="crack.py shows how quickly unsalted SHA-256 hashes fall"
```

## Accounts in the database

Create `db.py`, with all three tables this chapter uses, so the schema doesn't change between lessons:

```python file=db.py
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL
);
"""


def connect(path: str | Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    return connection
```

Everything here is Chapter 5. `users.password_hash` holds the `scrypt$…` string; there is no password column, anywhere. `sessions` and `projects` are used in lessons 6.2 and 6.3.

```check
file db.py
```

## Register and check a login

Create `accounts.py`:

```python file=accounts.py
import passwords

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
```

- **`email.strip().lower()`**, on the way in **and** on the way out: `" Ana@Example.com "` and `"ana@example.com"` are the same person. Normalising in one place, at the boundary, means the `UNIQUE` constraint really means "one account per person".
- **`check_login` returns the user's id, or `None`**, and the caller can't tell *why* it's `None`. That's deliberate: a login form that says "no account with that email" tells an attacker which emails are registered.
- **`NOBODY`**: when there's no such user, the code still runs scrypt once, against a hash nobody can match. Without it, a wrong email would answer in 1 millisecond and a wrong password in 55, and an attacker timing the responses could again tell which emails exist. Making both paths take the same time closes that.

```check
run ".venv/Scripts/python -m pytest -q tests/test_accounts.py -k test_user" label="users are stored with a hash, emails normalised, and logins checked"
```

## Register and log in over HTTP

Create `app.py`:

```python file=app.py
import os
import sqlite3
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
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


@app.post("/register", status_code=201)
def register(credentials: Credentials, connection: Connection) -> dict:
    try:
        user_id = accounts.add_user(connection, credentials.email, credentials.password)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="that email is already registered") from None
    return {"id": user_id}


@app.post("/login")
def login(credentials: Credentials, connection: Connection) -> dict:
    user_id = accounts.check_login(connection, credentials.email, credentials.password)
    if user_id is None:
        raise HTTPException(status_code=401, detail="wrong email or password")
    return {"id": user_id}
```

The pattern is Chapter 5's (`get_connection` is lesson 5.3's dependency with `yield`, configured by an environment variable), with two new pieces:

- **`HTTPException(status_code=…, detail=…)`**: raising it inside a route makes FastAPI answer with that status and `{"detail": …}` as the body. It's lesson 4.2's `BadRequest` idea, provided by the library. **409 Conflict** for an email that's taken (the `UNIQUE` constraint said no); **401 Unauthorized** for a failed login.
- **`Field(min_length=12, …)`** on `password`: length is what makes a password hard to guess, and a 12-character minimum (with no rules about symbols) is current guidance. `max_length=200` stops someone sending a 100-megabyte "password" to make scrypt chew on it.

The login route proves who someone is, and then forgets them: the next request knows nothing. Fixing that is lesson 6.2.

```check
run ".venv/Scripts/python -m pytest -q tests/test_accounts.py" label="register and log in over HTTP: 201, 409 for a taken email, 422 for a short password, 401 for a wrong one" -- Raise HTTPException(status_code=401, detail="wrong email or password") when check_login returns None.
```
