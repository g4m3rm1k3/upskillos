---
title: 15.1 — Design Ticket Dependencies Independently
track: Database Engineering — Engineering Capstone and Transfer
trackOrder: 46.15
runtime: none
---

Extend Issue Desk without a supplied target schema. A ticket can depend on several other tickets. Dependency endpoints must exist, the same pair cannot repeat, and a ticket cannot directly depend on itself.

## Separate the minimum contract from stronger rules

One row represents one directed dependency: ticket A waits for ticket B. Reversing the pair changes its meaning. Both fields are foreign keys to tickets. Pair uniqueness and a self-reference CHECK solve the stated local rules.

Longer cycles, such as A→B→C→A, require graph reasoning. A recursive CTE repeatedly extends a query from an initial set to newly reached rows; UNION can suppress repeated rows, while UNION ALL keeps them. A cycle detector must have a termination strategy. Detecting a cycle in a single transaction is still not enough if concurrent transactions can each insert edges that together form a cycle. Define an appropriate serialization/locking strategy before promising an acyclic graph. This capstone's required automated contract covers local rules only; global cycle safety is an explicit advanced extension.



## Prepare a review package

```predict
question: Does rejecting A→A also reject A→B→A?
choice: No
choice: Yes
answer: No
explain: The local self-reference check does not inspect paths through other rows.
```

Write your proposed schema and explain deletion behavior before implementing it. Decide whether cross-team dependencies are allowed. Compare a composite primary key with a generated key plus a unique pair: what references would justify the extra identity? Include a migration preserving existing tickets, authorized read/write entry points and a plan for reporting blocked work. Reuse the migration, permission, concurrency and restore patterns rather than inventing a disconnected demo.

Your handoff should contain an entity-relationship diagram, a data dictionary (field meaning, type, nullability, unit and ownership), representative queries, tests, performance evidence and a recovery runbook. A reviewer should be able to reproduce the system without this conversation.



## Your turn: implement the dependency relation

Create dependencies.sql defining ticket_dependencies(ticket_id, depends_on_id). Both are required INTEGER references to tickets(ticket_id). The pair is its primary key. Add a CHECK refusing identical endpoints. Keep deletion restrictive for this minimum contract. The tests accept distinct dependencies and reject duplicates, self-links and orphans. Separately explain how you would enforce team boundaries and longer-cycle safety; those are not certified by these local checks.


```hints
nudge: Write one row meaning before choosing a key.
concept: Two independent references and pair uniqueness solve different requirements.
shape: Combine the foreign keys, composite primary key and unequal-endpoint CHECK.
```

```check
run "python checks/verify.py dependencies" exit=0 label="Enforce the independently designed local graph rules" stdout="PASS dependencies" -- Run the command yourself and compare the actual result with the lesson trace.
```
