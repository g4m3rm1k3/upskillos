---
title: 3 — Model relationships and upgrade history
track: Backend Developer Bootcamp — Django — Service Desk
trackOrder: 51.02
runtime: none
---

Outcome: model tickets and audit events with foreign keys and a database constraint, then generate and inspect a migration.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Declare the data model

A ticket belongs to one user; a user can own many tickets. An audit event references both its ticket and actor. PROTECT prevents casual deletion of records that history still references; a real retention policy may use anonymization with a documented legal basis. Do not copy usernames into every ticket as a substitute for a relationship.

The status check exists in the database because code paths other than a form can write data. The owner/id index serves the owner-scoped page query. Indexes speed reads but consume storage and make writes more expensive. `created_at` is captured by the server, not trusted from the browser.

```python file=tickets/models.py
from django.conf import settings
from django.db import models

class Ticket(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    subject = models.CharField(max_length=120)
    status = models.CharField(max_length=10, default="open")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(status__in=["open", "closed"]), name="ticket_status")]
        indexes = [models.Index(fields=["owner", "-id"], name="ticket_owner_page")]

class Audit(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)
```


```predict
question: Does editing models.py alter a deployed database immediately?
choice: No
choice: Yes
answer: No
explain: Schema migrations must be generated, reviewed and applied.
```

## Generate and inspect migrations

Run `python manage.py makemigrations tickets`, `python manage.py sqlmigrate tickets 0001`, then `python manage.py migrate`. Inspect the SQL before applying it. Migrations describe schema history and belong in Git. A model change without a migration may appear fine in code but fail when the database is accessed.

Run `python manage.py createsuperuser` to create a local development account using the password prompt. This scaffold does not include an admin site; the account can sign in through the login view we add next. Privileged account creation belongs in a controlled operator workflow, never an anonymous endpoint.

## Your turn: add priority without losing tickets

Add a priority field with an explicit finite set of values and database constraint. Generate a new migration, inspect its SQL, migrate a database that already contains a ticket, and verify that ticket survives. Explain why deleting migration history is not a safe fix for a failed upgrade.

Write your evidence in `evidence/models.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/models.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

An ORM relationship is not merely an object pointer: inspect its stored foreign-key column. Explain the difference between validation in a form and a database constraint.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
