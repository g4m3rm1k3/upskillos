---
title: 2 — Separate meaning from transport
track: Backend Developer Bootcamp — FastAPI — Equipment Booking
trackOrder: 51.01
runtime: none
---

Outcome: express the booking date rule without importing FastAPI or SQL. A function that accepts a value and returns a value is cheap to test and can later serve a CLI or background worker.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Implement the domain rule

`date.fromisoformat` parses a date; it does not know the workshop's booking policy. The second condition adds that policy. Returning ISO text normalizes valid input. The workshop uses the server's calendar date in this first release; before supporting multiple time zones, make the workshop's zone an explicit business decision.

A raised `ValueError` is an application failure. The HTTP layer will translate it into 422. The domain should not import `HTTPException`, because a batch importer has no HTTP response.

```python file=domain.py
from datetime import date

def validate_day(value: str) -> str:
    day = date.fromisoformat(value)
    if day < date.today():
        raise ValueError("booking day is in the past")
    return day.isoformat()
```


```predict
question: Should this function know whether failure becomes HTTP 422?
choice: No
choice: Yes
answer: No
explain: Transport chooses the response; domain code states the rule.
```

## Practice the language at the boundary

Run `python -c "from domain import validate_day; print(validate_day('2099-01-01'))"`. Then pass `yesterday`. Read the final traceback line first and trace back to your file. Python type annotations document expected types; they do not validate arbitrary runtime input on their own. Pydantic will handle HTTP input later.

There is no reward for adding a repository interface before it solves a problem. We separate pure policy from I/O now because they change and fail for different reasons.

## Your turn: add a maximum advance window

Before touching the HTTP code, write tests for today, tomorrow, the final allowed day and the first forbidden day. Implement a 90-day limit. Decide whether day 90 is included and document your choice; preserve the existing past-date rule.

Write your evidence in `evidence/domain.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/domain.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

An off-by-one date error is a policy ambiguity until you define the boundary. Explain how injecting a clock would make a midnight test deterministic.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
