---
title: 15.2 — Prove You Can Transfer the Design
track: Database Engineering — Engineering Capstone and Transfer
trackOrder: 46.15
runtime: none
---

A working reference is not the same as independent competence. Finish with an unfamiliar brief and an evidence-based review.

## A new brief without a target solution

Design a small equipment-loan database: individual items, borrowers, loans and returns. One physical item must not have two active loans. Decide how identities, optional return time, history and authorization work. Supply example valid and invalid records before writing tables. Compare a unique partial index on active loans with a separate current-loan relation; justify the choice under your query workload.

Build the minimum operations through parameterized SQL, write a competing-session test for simultaneous checkout, migrate populated data and restore a backup. Do not copy the ticket schema and rename its nouns without revisiting the invariants. The independent solution is deliberately not supplied; a mentor or peer reviews the design and evidence.



## Assess four kinds of understanding

```predict
question: Does passing a reference walkthrough prove that you can independently design an unfamiliar system?
choice: No
choice: Yes
answer: No
explain: It proves exercised behaviors, while transfer requires new decisions and evidence.
```

Compute: write the query and trace its rows. Explain: justify a key, NULL policy and transaction boundary. Detect: diagnose a cardinality bug, stale write or slow plan. Transfer: implement the unfamiliar brief without a target.

For the Issue Desk portfolio, present schema and diagram, representative queries, a parameterized operation, permission tests under appropriate roles, the two-session conflict trace, migration preservation, real plan measurements and restore evidence. State limitations honestly: the course's local CLI and transport-independent response function do not provide deployed authentication or a production operations platform. Treat production deployment as a separate reviewed integration, not an automatic graduation badge.



## Your turn: submit an engineering handoff

Create HANDOFF.md with Requirements, Schema, Queries, Integrity, Concurrency, Permissions, Migrations, Performance, Recovery and Limitations sections. Link your actual files and measurements. Run the capstone check and earlier focused tests you changed. The existence check records a submission only: human review of the content and unfamiliar-domain project is required for independent completion.


```hints
nudge: Use evidence from your project, not generic assurances.
concept: A successful run proves only the behavior actually exercised.
shape: Connect each requirement to a file, test or measured observation.
```

```check
run "python checks/verify.py dependencies" exit=0 label="The capstone relation still enforces its local rules" stdout="PASS dependencies" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
file HANDOFF.md -- Submit the evidence and limitations, not just a completion claim.
```
