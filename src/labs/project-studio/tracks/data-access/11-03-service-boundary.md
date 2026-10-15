---
title: 11.3 — Keep Identity, Connections and Responses Separate
track: Database Engineering — Permissions and Service Boundaries
trackOrder: 46.11
runtime: none
---

The database operation now feeds a service response. This lesson builds the transport-independent response function; it does not deploy a public authenticated server.

## Translate rows at the boundary

HTTP is a request/response protocol. A request has a method, target, headers and optional body. A response has a status, headers and body. 200 indicates success; 400 indicates bad input; 401 means authentication is needed; 403 means forbidden; 404 may intentionally conceal a resource; 500 indicates an unexpected server fault. These are protocol meanings, not database exception codes.

Create responses.py. `for ticket_id,title in rows` unpacks each two-field tuple. append adds a dictionary to a list. The function returns a two-item tuple: status and JSON text. A transport adapter would set Content-Type to application/json and send that body. Identity is already authenticated before this function is called. An empty visible collection is returned consistently without revealing whether a hidden project exists.

```python file=responses.py
import json
from access import visible_tickets

def ticket_response(db, authenticated_user_id, project_id):
    rows = visible_tickets(db, authenticated_user_id, project_id)
    records = []
    for ticket_id, title in rows:
        records.append({"id": ticket_id, "title": title})
    return 200, json.dumps({"tickets": records})
```

```check
run "python checks/verify.py response" exit=0 label="Serialize only authorized rows" stdout="PASS response" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Budget a request

```predict
question: Should the web handler hold a database transaction while waiting for an unrelated network service?
choice: No
choice: Yes
answer: No
explain: It unnecessarily retains connections, snapshots and potentially locks.
```

A pool lends a connection for the database portion of a request and returns it afterward. Set statement and lock timeouts within a transaction, and apply a total request deadline. A statement timeout alone does not bound all retries or network waits. On failure, roll back before reuse. Avoid logging credentials, query-bound personal content or full exception details to a public response.

Integration testing should run the response boundary with a real database, test malformed identifiers before SQL, and verify that a trusted authentication adapter supplies the actor. The local developer CLI intentionally lacks that adapter; a production deployment needs a reviewed authentication integration, TLS, secret management and service lifecycle work beyond this transport-independent course project.



## Your turn: write a connection contract

Create connection-contract.txt naming where authentication happens, when the connection is borrowed, where the transaction ends, how failures are rolled back, and how an identity is reset before pool reuse. Then run the response test. A human review must assess the contract; a file check cannot certify a secure server.


```hints
nudge: Trace one request through success and failure.
concept: The next pool borrower must not inherit this caller's identity.
shape: Separate authentication, transaction lifetime and connection release.
```

```check
run "python checks/verify.py response" exit=0 label="The response remains scoped" stdout="PASS response" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
file connection-contract.txt -- Explain the ownership and identity boundaries.
```
