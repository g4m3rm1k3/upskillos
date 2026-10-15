---
title: 11.2 — Add a Database Row Boundary
track: Database Engineering — Permissions and Service Boundaries
trackOrder: 46.11
runtime: none
---

Row-level security (RLS) can protect ticket rows even when a service query accidentally omits its team predicate. It is defense in depth, not a replacement for authenticated identity or table privileges.

## Read a policy as a row predicate

ENABLE ROW LEVEL SECURITY makes ordinary permitted operations subject to policies. With no applicable policy, rows are denied. FOR SELECT USING filters readable rows. FOR UPDATE USING identifies old rows eligible for update; WITH CHECK validates their new state. This prevents moving an allowed ticket into a forbidden project. Table-level GRANT is still required.

current_setting reads a session setting; true means missing settings return NULL rather than error. NULLIF(value,'') turns an empty string into NULL. `::integer` casts text to an integer. The trusted service sets app.user_id transaction-locally after authenticating a request. A direct database user who can issue arbitrary SQL can set this variable too; this design must not be offered as authentication for untrusted direct SQL access.

Create policies.sql. Projects and memberships in this teaching probe are readable reference tables. A real product must separately scope those tables if their metadata is confidential; this policy protects tickets only.

```sql file=policies.sql
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_reads ON tickets FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects p JOIN memberships m ON m.team_id=p.team_id
        WHERE p.project_id=tickets.project_id
          AND m.user_id=NULLIF(current_setting('app.user_id',true),'')::integer
    )
);
CREATE POLICY ticket_edits ON tickets FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM projects p JOIN memberships m ON m.team_id=p.team_id
        WHERE p.project_id=tickets.project_id AND m.role='editor'
          AND m.user_id=NULLIF(current_setting('app.user_id',true),'')::integer
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p JOIN memberships m ON m.team_id=p.team_id
        WHERE p.project_id=tickets.project_id AND m.role='editor'
          AND m.user_id=NULLIF(current_setting('app.user_id',true),'')::integer
    )
);
```

```check
run "python checks/verify.py rls" exit=0 label="Exercise ticket policies under a real restricted role" stdout="PASS rls" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Avoid owner and pool traps

```predict
question: Does a successful query as the table owner prove that ordinary application users are constrained by RLS?
choice: No
choice: Yes
answer: No
explain: Owners normally bypass RLS; privileged roles can bypass it too.
```

Test with a nonowner role without BYPASSRLS, as the supplied probe does. FORCE ROW LEVEL SECURITY can subject an owner to policies, but superusers and BYPASSRLS roles still bypass them. Constraint checks can expose information through errors; choose public error messages carefully.

Set identity inside each transaction using `SELECT set_config('app.user_id', value, true)`. true makes it transaction-local. A pool reuses connections: session-wide identity can accidentally survive for the next user. A new request needs a fresh transaction and explicit identity. Role changes and failed transactions also need reliable reset.



## Your turn: fail closed without identity

Create identity.sql setting app.user_id to an empty value transaction-locally using set_config. The restricted-role probe must then read no tickets. Explain why defaulting to an administrator identity would be dangerous.


```hints
nudge: The policy already maps an empty setting to NULL.
concept: An unknown identity should match no memberships.
shape: Set an empty value locally instead of selecting a user as fallback.
```

```check
run "python checks/verify.py no_identity" exit=0 label="Missing request identity yields no ticket rows" stdout="PASS no_identity" -- Run the command yourself and compare the actual result with the lesson trace.
```
