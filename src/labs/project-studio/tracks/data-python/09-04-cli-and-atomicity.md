---
title: 9.4 — Close Connections and Roll Back Failures
track: Database Engineering — Application Code from the Beginning
trackOrder: 46.09
runtime: none
---

The SQL transaction from chapter 7 now belongs inside an application operation. Preserve create_ticket and add close_ticket to issue.py.

## Give both writes one lifetime

`with db.transaction()` commits on normal exit and rolls back if an exception escapes. Its indented body is the entire business operation. The UPDATE returns a row only when it changed an open ticket. If no row returns, raise before inserting an event. A failure in the event insert also rolls back the status update.

The acceptance test temporarily adds a constraint that rejects the event. It proves the original status and version survive after the exception. Catching the error inside the with block and pretending success would interfere with this contract. Error translation belongs outside the transaction.

```python file=issue.py
def create_ticket(db, project_id, title, minutes):
    title = title.strip()
    if not title:
        raise ValueError("A title is required")
    if minutes is not None and minutes < 0:
        raise ValueError("Negative estimate")
    row = db.execute(
        "INSERT INTO tickets(project_id,title,estimate_minutes,status,created_at) "
        "VALUES (%s,%s,%s,'open',CURRENT_TIMESTAMP) RETURNING ticket_id",
        (project_id, title, minutes),
    ).fetchone()
    return row[0]

def close_ticket(db, ticket_id):
    with db.transaction():
        row = db.execute(
            "UPDATE tickets SET status='closed',version=version+1 "
            "WHERE ticket_id=%s AND status='open' RETURNING ticket_id",
            (ticket_id,),
        ).fetchone()
        if row is None:
            raise ValueError("No open ticket")
        db.execute(
            "INSERT INTO ticket_events(ticket_id,new_status) VALUES (%s,'closed')",
            (ticket_id,),
        )
```

```check
run "python checks/verify.py atomic" exit=0 label="Keep status and history atomic under injected failure" stdout="PASS atomic" -- Run the command yourself and compare the actual result with the lesson trace.
```

## A small command-line entry point

sys.argv is the list of command-line arguments; index 0 names the script. len counts items. `!=` means unequal. SystemExit ends the program with a usage message. The int conversion rejects a nonnumeric project ID. The with block closes its connection after printing the generated ID.

Create cli.py. Before using it on a populated practice schema, point PGOPTIONS at that schema or use a dedicated database with pg-model.sql and sample.sql loaded once. `python cli.py 10 "Fix the search box"` intentionally writes one ticket. It is a local developer CLI, not an authenticated public API. Do not use it to claim a tenant boundary; chapter 11 supplies protected operations. The automated test invokes it only in an isolated schema.

```python file=cli.py
import sys
import psycopg
from issue import create_ticket

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit('Usage: python cli.py PROJECT_ID "Title"')
    project_id = int(sys.argv[1])
    title = sys.argv[2]
    with psycopg.connect(autocommit=True) as db:
        ticket_id = create_ticket(db, project_id, title, None)
        print(ticket_id)
```

```check
run "python checks/verify.py cli" exit=0 label="Create a ticket through the actual CLI process" stdout="PASS cli" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Keep SQL visible while considering an ORM

```predict
question: If a database error occurs between the update and event insert, should the function report success?
choice: No
choice: Yes
answer: No
explain: The transaction failed and its changes must roll back.
```

An ORM maps application objects to database operations. A query builder constructs SQL through an API. Neither removes the need to understand joins, transactions, constraints or generated queries. Compare the SQL you wrote with a proposed ORM mapping: where does the transaction begin, how many queries execute and what happens on a constraint violation? Keep that review in design-notes.md before adopting another layer.



## Your turn: explain the failed operation

Create failure-contract.txt with three labeled lines: Before, Failure, After. State the original ticket status/version, the injected event rejection, and the required unchanged status/version plus no new event. Then run the real atomicity test again. The file check only records that you wrote a review; a human must assess its reasoning.


```hints
nudge: Follow both tables through the same transaction.
concept: A rolled-back update must not retain its version increment.
shape: Describe the before state, failure point and exact restored state.
```

```check
run "python checks/verify.py atomic" exit=0 label="The implementation still rolls back both writes" stdout="PASS atomic" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
file failure-contract.txt -- Write the failure explanation in your own words.
```
