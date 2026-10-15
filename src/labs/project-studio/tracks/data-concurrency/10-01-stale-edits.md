---
title: 10.1 — Reject a Stale Edit
track: Database Engineering — Concurrent Users and Retries
trackOrder: 46.1
runtime: none
---

Two engineers read Login at version 1. Ada renames it. Ben submits a form built from the old version. A plain UPDATE by identity silently overwrites Ada's work.

## Act out the lost update

Use two psql terminals against a disposable fixture. Session A reads title/version; session B reads the same values. A changes the title and commits. B changes it using only ticket_id and commits. The later write wins even though B's form was stale. A transaction alone did not express the version requirement.

An **optimistic concurrency check** includes the version the user actually read. The database updates only if that version still matches. A successful write increments it. This is one atomic SQL statement; checking the version in a separate SELECT before an unconditional UPDATE has a race.



## Make a stale submission observable

Create edits.py. expected_version comes from the earlier read, not a fresh read immediately before updating. Returning None means no matching version/identity was updated; the caller must ask for refresh or merge rather than claim success. The application may choose not to distinguish missing from stale to avoid exposing another user's data. Authorization is still separate and follows in chapter 11.

```python file=edits.py
def rename_ticket(db, ticket_id, expected_version, title):
    row = db.execute(
        "UPDATE tickets SET title=%s, version=version+1 "
        "WHERE ticket_id=%s AND version=%s RETURNING version",
        (title, ticket_id, expected_version),
    ).fetchone()
    if row is None:
        return None
    return row[0]
```

```check
run "python checks/verify.py optimistic" exit=0 label="Reject a stale write across two real sessions" stdout="PASS optimistic" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Separate safety from user experience

```predict
question: Should the application silently retry a user edit with the newest version number?
choice: No
choice: Yes
answer: No
explain: That would discard the user-visible conflict and could overwrite work they never saw.
```

A database serialization retry repeats one logical transaction after a transient conflict. A stale form is a business conflict requiring an explicit product policy. Those are different retries. In your experiment, show Ada's new title and Ben's submitted title side by side. Explain what a merge screen needs from the old version.



## Your turn: a second stale field

Create estimates.py with change_estimate(db,ticket_id,expected_version,minutes), updating estimate_minutes and incrementing version only when both identity and version match. Return the new version or None, following edits.py. Existing schema constraints still reject negative estimates.


```hints
nudge: The comparison and update belong in one statement.
concept: Use the version supplied by the earlier reader.
shape: Keep the identity/version WHERE and RETURNING version pattern.
```

```check
run "python checks/verify.py estimate" exit=0 label="Apply one estimate and reject the stale second edit" stdout="PASS estimate" -- Run the command yourself and compare the actual result with the lesson trace.
```
