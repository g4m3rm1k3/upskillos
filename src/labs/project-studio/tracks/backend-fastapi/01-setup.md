---
title: 1 — From terminal to an HTTP contract
track: Backend Developer Bootcamp — FastAPI — Equipment Booking
trackOrder: 51.01
runtime: none
---

Build LensPool, a service that lets a workshop reserve equipment for whole days. The hard rule is one booking per piece of equipment per day. Start with Python functions, dictionaries and exceptions; frontend experience helps with HTTP but is not required. Use Python 3.12 or 3.13, a terminal and Git. This section teaches API composition rather than assuming an MVC framework.

### The story so far

Start here in an empty project folder. This framework section stands alone; you do not need files from another backend section.

## Create the project and isolate its tools

Choose an empty folder named lenspool in Project Studio Desktop. Commands below run there. `pwd` (PowerShell: `Get-Location`) prints the working directory. A virtual environment gives this app its own installed packages; it is not a container or a security boundary.

macOS/Linux:
```sh
python3 -m venv .venv
source .venv/bin/activate
python --version
```
PowerShell:
```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python --version
```
If activation is restricted, invoke `.venv\Scripts\python.exe` directly. In the Desktop terminal activate this environment too; another terminal's activation does not change this one. `python -m pip` selects pip belonging to that interpreter.

```predict
question: Can a disabled booking button enforce one booking per day?
choice: No; the server and database enforce it
choice: Yes; the browser controls all requests
answer: No; the server and database enforce it
explain: Clients can send HTTP without using your page.
```

## Declare dependencies

FastAPI translates HTTP into typed Python calls. Uvicorn listens on a socket. HTTPX provides a client for tests; pytest discovers test functions. These compatibility ranges are not a lockfile. Run `python -m pip install -r requirements.txt`, then `python -m pip freeze > requirements.lock.txt`. Commit the resolved lock after testing; use `python -m pip install -r requirements.lock.txt` to reproduce it.

```text file=requirements.txt
fastapi>=0.115,<1
uvicorn>=0.34,<1
httpx>=0.28,<1
pytest>=8,<10
```


## Protect local state

Run `git init`, `git status`, then inspect `git diff` as you work. Keep source and the dependency lock in history; keep credentials and runtime databases outside it. A local commit records a reviewed snapshot; publishing a repository or deploying it is a separate operation.

```text file=.gitignore
.venv/
__pycache__/
.pytest_cache/
*.db
.env
```


## Write the contract before the server

A request has a method, path, headers and optional body. A response has a status, headers and body. `POST /bookings` accepts equipment and day and returns 201 with an id. Reading your booking returns 200; another owner's id returns 404; a taken slot returns 409; invalid input returns 422; missing credentials return 401. A 404 policy avoids explicitly confirming someone else's booking, but does not eliminate every timing side channel.

Write these examples on paper. The browser owns presentation; the server owns identity, validation and business rules; the database enforces durable uniqueness. Never accept `owner` from the client. A request DTO (data transfer object) is a public contract; a database row is internal storage. We will intentionally make them different.

## Your turn: draw the trust boundaries

Create `architecture.txt` with client → HTTP adapter → application rule → SQL store. Beside each arrow identify untrusted data and failure responses. Add two requests that a malicious client could send even when the UI disables its button.

Write your evidence in `evidence/setup.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/setup.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If pip installs but imports fail, compare `python -c "import sys; print(sys.executable)"` with the environment you intended. Explain why port 8000 identifies a process endpoint and why localhost refers to this machine.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
