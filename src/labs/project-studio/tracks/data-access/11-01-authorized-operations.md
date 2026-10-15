---
title: 11.1 — Authorize the Operation, Not Just the Screen
track: Database Engineering — Permissions and Service Boundaries
trackOrder: 46.11
runtime: none
---

Ada belongs to Platform. Ben is a Platform viewer and a Mobile editor. Knowing who a caller is does not imply they can edit every ticket.

## Read through a membership boundary

**Authentication** establishes a caller's identity. **Authorization** decides whether that identity may perform this action on this resource. The actor_id below must come from a trusted authenticated session in a real service, never from a caller-supplied query parameter. Our local CLI is a developer tool and has no authentication service.

Create access.py with visible_tickets first. EXISTS checks membership through the ticket's project. fetchall returns a list of returned tuples; an empty result is a successful query with no visible rows. The query scopes the data before returning it. Filtering afterward risks leaks through exports, counts or logs.

```python file=access.py
def visible_tickets(db, actor_id, project_id):
    return db.execute(
        "SELECT t.ticket_id,t.title FROM tickets t "
        "WHERE t.project_id=%s AND EXISTS ("
        "SELECT 1 FROM projects p JOIN memberships m ON m.team_id=p.team_id "
        "WHERE p.project_id=t.project_id AND m.user_id=%s) "
        "ORDER BY t.ticket_id",
        (project_id, actor_id),
    ).fetchall()
```

```check
run "python checks/verify.py visibility" exit=0 label="Allow team reads and hide another team" stdout="PASS visibility" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Check permission in the write

Append close_for. Its UPDATE includes the membership and editor predicates in the same statement as the write. A viewer may read but not close. The error deliberately does not reveal whether an inaccessible identity exists. PermissionError is a Python exception describing a forbidden operation; it is translated to an appropriate response at the service boundary.

History remains inside the transaction. Do not expose the earlier unguarded close_ticket as a public API endpoint. Data-integrity constraints still matter even with this guard; authorization and integrity solve different problems.

```python file=access.py
def visible_tickets(db, actor_id, project_id):
    return db.execute(
        "SELECT t.ticket_id,t.title FROM tickets t "
        "WHERE t.project_id=%s AND EXISTS ("
        "SELECT 1 FROM projects p JOIN memberships m ON m.team_id=p.team_id "
        "WHERE p.project_id=t.project_id AND m.user_id=%s) "
        "ORDER BY t.ticket_id",
        (project_id, actor_id),
    ).fetchall()

def close_for(db, actor_id, ticket_id):
    with db.transaction():
        row = db.execute(
            "UPDATE tickets t SET status='closed',version=version+1 "
            "WHERE t.ticket_id=%s AND t.status='open' AND EXISTS ("
            "SELECT 1 FROM projects p JOIN memberships m ON m.team_id=p.team_id "
            "WHERE p.project_id=t.project_id AND m.user_id=%s AND m.role='editor') "
            "RETURNING ticket_id",
            (ticket_id, actor_id),
        ).fetchone()
        if row is None:
            raise PermissionError("No accessible open ticket")
        db.execute(
            "INSERT INTO ticket_events(ticket_id,new_status) VALUES(%s,'closed')",
            (ticket_id,),
        )
```

```check
run "python checks/verify.py authorization" exit=0 label="Deny viewer and cross-team writes while allowing an editor" stdout="PASS authorization" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Review every route to the same data

```predict
question: Is hiding an Edit button sufficient to prevent an unauthorized write?
choice: No
choice: Yes
answer: No
explain: A client can send a request without using that button.
```

List detail, search, export, reporting and mutation routes. Each must enforce a boundary, including joins and counts. Test a permitted case as well as denied cases, or an implementation that returns nothing for everyone could pass. Revoke membership and retry the operation; authorization is checked at the statement snapshot. Immediate revocation across already-running transactions needs an explicit stronger product policy.



## Your turn: scope the count too

Write counts.py with visible_count(db,actor_id,project_id), returning the number of visible tickets using the same membership EXISTS boundary. Return the first field from fetchone. Do not fetch an unrestricted count and hide only the individual records.


```hints
nudge: A report is another read surface.
concept: Preserve the membership predicate when aggregating.
shape: Count only rows qualifying through the same EXISTS subquery.
```

```check
run "python checks/verify.py count_scope" exit=0 label="A count does not leak cross-team tickets" stdout="PASS count_scope" -- Run the command yourself and compare the actual result with the lesson trace.
```
