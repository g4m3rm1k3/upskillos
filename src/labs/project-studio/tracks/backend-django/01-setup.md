---
title: 1 — A framework with a workflow
track: Backend Developer Bootcamp — Django — Service Desk
trackOrder: 51.02
runtime: none
---

Build HelpHarbor, an internal service desk where employees create and close their own tickets. Start independently in a folder named helpharbor. You need Python functions, dictionaries and exceptions; Python 3.12 or 3.13 and Git. Django supplies an ORM, forms, sessions and templates, so this project deliberately uses server-rendered HTML rather than recreating the FastAPI design.

### The story so far

Start here in an empty project folder. This framework section stands alone; you do not need files from another backend section.

## Prepare the interpreter

From the empty project root run `python3 -m venv .venv` and `source .venv/bin/activate` on macOS/Linux. On PowerShell run `py -3 -m venv .venv` then `.venv\Scripts\Activate.ps1`; if activation is unavailable use `.venv\Scripts\python.exe` for Python commands. Confirm `python --version` and `python -m pip --version`. `pwd` or `Get-Location` tells you which project receives generated files.

```predict
question: Is a Django view the same thing as an HTML template?
choice: No
choice: Yes
answer: No
explain: The view coordinates the request; the template renders its representation.
```

## Install the framework

Run `python -m pip install -r requirements.txt`, then `python -m pip freeze > requirements.lock.txt`. Use the lock for clean reinstall and CI; the range selects the Django 5.2 line without claiming a particular patch has been audited. Run `python -m django startproject desk .` and `python manage.py startapp tickets`. These commands create the package files that later steps replace. Do not run startproject from inside another Django project.

```text file=requirements.txt
Django>=5.2,<5.3
```


## Keep local data local

Run `git init` and inspect `git status`. Commit migrations as source; ignore the database containing personal records. The scaffold generates a development secret; we replace it with required environment configuration next. A .gitignore cannot remove a secret already committed.

```text file=.gitignore
.venv/
__pycache__/
*.db
.env
```


## Map MVC to Django

Django calls this organization Model–Template–View. Models describe persisted data; templates render representations; views coordinate requests. A Django view plays much of the controller role in common MVC vocabulary. URL routing selects the view. A service function will hold the close-ticket use case so the same rule can serve a web request or a future job.

Do not build an elaborate “clean architecture” folder tree simply to rename Django. Extract a boundary when it has a reason: a transaction, a rule reused by two entry points, or an integration with independent failure behavior.

## Your turn: describe the workflow

Draw create → open → closed. State who may transition a ticket and whether reopening is allowed. Decide whether a staff member can see employee content; our first implementation does not add staff access implicitly. Write one unauthorized scenario and one audit requirement.

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

If manage.py cannot import desk, check the current directory and environment. Explain why a Django project (configuration) is different from a Django app (a feature package).

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
