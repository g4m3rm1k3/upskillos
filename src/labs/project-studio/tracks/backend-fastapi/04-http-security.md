---
title: 4 — Expose a narrow authenticated API
track: Backend Developer Bootcamp — FastAPI — Equipment Booking
trackOrder: 51.01
runtime: none
---

Outcome: compose dependencies, input schemas, domain policy and storage into an API. FastAPI does not mandate MVC. Here the route is a transport adapter, the domain function holds policy and the store owns SQL.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Build the application factory

An app factory lets tests use disposable databases. Lifespan initializes local storage before requests. `Depends` resolves identity on the server, and an explicit response model prevents an internal row from accidentally leaking credentials. Extra input fields are forbidden to prevent mass assignment. A synchronous route is intentional: this store uses blocking SQLite. Writing `async def` would not turn blocking SQL into asynchronous I/O.

Authentication answers who holds a valid credential; authorization decides which booking that identity can read. The ownership predicate belongs in the lookup, not just in the UI. Catch only known business conflicts; an unexpected database outage must not masquerade as a duplicate booking.

```python file=main.py
import os
import sqlite3
from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from domain import validate_day
import store

class BookingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    equipment: str = Field(pattern=r"^[a-z0-9-]{1,40}$")
    day: str

class BookingOut(BaseModel):
    id: int
    equipment: str
    day: str

def create_app(path="bookings.db"):
    @asynccontextmanager
    async def lifespan(app):
        store.initialize(path)
        yield

    app = FastAPI(lifespan=lifespan)
    bearer = HTTPBearer(auto_error=False)

    def current_owner(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
        owner = store.identity(path, credentials.credentials) if credentials else None
        if owner is None:
            raise HTTPException(401, "invalid credential", headers={"WWW-Authenticate": "Bearer"})
        return owner

    @app.get("/health")
    def health():
        return {"status": "up"}

    @app.post("/bookings", status_code=201, response_model=BookingOut)
    def book(body: BookingIn, owner: Annotated[str, Depends(current_owner)]):
        try:
            day = validate_day(body.day)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        try:
            return store.reserve(path, owner, body.equipment, day)
        except sqlite3.IntegrityError as exc:
            raise HTTPException(409, "equipment already booked") from exc

    @app.get("/bookings/{booking_id}", response_model=BookingOut)
    def get_booking(booking_id: int, owner: Annotated[str, Depends(current_owner)]):
        result = store.owned(path, owner, booking_id)
        if result is None:
            raise HTTPException(404, "booking not found")
        return result

    return app

app = create_app(os.getenv("BOOKING_DB", "bookings.db"))
```


```predict
question: May the client choose owner in its JSON body?
choice: No
choice: Yes
answer: No
explain: Identity comes from the authenticated credential; accepting owner would let callers impersonate others.
```

## Provision a service credential

Run `python manage.py alice` locally. It prints a one-hour random bearer token once. Treat that output as a secret; do not paste it into source, evidence files or Git. Provisioning requires local filesystem access and is not a public signup endpoint. Tokens expire and can be revoked by deleting their digest. Anyone holding one can act as its owner. This is a service-credential model, not an end-user login system.

```python file=manage.py
import argparse
import os
import secrets
import store

parser = argparse.ArgumentParser(description="Provision a one-hour service credential locally")
parser.add_argument("owner")
args = parser.parse_args()
path = os.getenv("BOOKING_DB", "bookings.db")
store.initialize(path)
token = secrets.token_urlsafe(32)
store.issue(path, token, args.owner)
print(token)
```


## Inspect a real request

Run `python -m uvicorn main:app --host 127.0.0.1 --port 8000`. In a second terminal run `curl -i http://127.0.0.1:8000/health` (PowerShell: use `curl.exe`). Open `/docs`, authorize with the temporary token, and send a future booking. Submit it twice. Observe 201 then 409. Remove authorization and observe 401. Stop Uvicorn with Ctrl+C.

Loopback is the local learning boundary. A deployed service needs TLS, ingress body/rate limits, protected provisioning, secret rotation, backups and monitoring. CORS controls which browser origins can read responses; it is not authentication. A future browser application should use a considered session or OIDC authorization-code/PKCE design, not embed this service credential in frontend JavaScript.

Reference: [FastAPI application composition](https://fastapi.tiangolo.com/tutorial/bigger-applications/).

## Your turn: implement revocation

Add a CLI revoke operation accepting an owner and removing that owner’s token digests with a parameterized query. Demonstrate that an already issued token immediately changes from 200 to 401. Do not print the raw token in the regression report.

Write your evidence in `evidence/http-security.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/http-security.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If you see 422 before your route body, inspect the input schema. If you see 401, inspect credential expiry and which database the CLI and server are using. Never “fix” either by disabling validation or ownership.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
