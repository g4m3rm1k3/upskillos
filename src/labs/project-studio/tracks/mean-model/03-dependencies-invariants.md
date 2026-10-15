---
title: Keys, Dependencies and Invariants — Design Before Collections
runtime: none
---

Outcome: derive a relationship model from functional dependencies, distinguish normalization from document layout, and test referential and uniqueness rules independently of an API. Complete the earlier modeling and snapshot workshops first. Keep the task-board folder. This is a small executable model, not an authentication implementation or a database engine.

### The story so far

The local board has one project. A collaboration product would have users belonging to projects with different roles. Before adding a members array, identify the relationship's identity, which facts depend on it and what must remain true as records change.

## Find the key of a relationship

Consider a flat membership table with columns projectId, projectName, userId, email and role. A row means a user belongs to a project. Its key is the pair (projectId, userId), not either id alone. One user can join several projects; one project can have several users. This is a many-to-many relationship represented by membership records.

| Fact | Depends on | Consequence |
|---|---|---|
| projectName | projectId | Renaming a project should not require editing every membership |
| email | userId | A user's contact change should not create contradictory memberships |
| role | projectId and userId together | A user can be editor in one project and viewer in another |

A functional dependency X → Y means that in every valid state, equal X values imply equal Y values. It expresses a domain rule, not a correlation observed in today's sample. The project name does not identify a project: distinct projects can share a display name.

## Normalize the logical model

First normal form requires single values from the chosen domains at each row/column intersection and no repeating column groups. Splitting comma-separated user ids is not a reliable relationship model. With this composite membership key, second normal form removes non-key attributes dependent on only part of the key: projectName goes to projects and email goes to users. Third normal form additionally avoids non-key facts depending transitively on the key through another non-key fact. For example, if a membership stores departmentId and departmentName, the department name belongs to the department's identity.

The practical result here is projects(id, name), users(id, email) and memberships(projectId, userId, role). A unique pair prevents duplicate memberships. Foreign keys in a relational database can enforce referenced rows; this MongoDB design must deliberately choose application checks, transactions and deletion policies instead. Logical normalization does not require physically storing every concept in a separate MongoDB collection. Workload and consistency boundaries still determine embedding.

```predict
question: If membership uniqueness is defined only by userId, can one user belong to two different projects?
explain: No. That constraint would reject a valid many-to-many relationship. Uniqueness belongs to the projectId/userId pair; role belongs to that pair too.
```

## Make the invariants executable

An invariant describes every accepted state, not only what one route happens to check. The small validator below checks unique identities, known references, allowed roles and membership-pair uniqueness. A Set keeps previously observed keys. JSON.stringify on a pair avoids ambiguous concatenation such as ids containing a separator character.

```javascript file=server/membership-model.mjs
export function validateMembershipModel({projects, users, memberships}) {
  function identities(records, label) {
    const ids = new Set();
    for (const record of records) {
      if (typeof record.id !== 'string' || !record.id) throw new Error('Invalid ' + label + ' id');
      if (ids.has(record.id)) throw new Error('Duplicate ' + label + ' id');
      ids.add(record.id);
    }
    return ids;
  }
  const projectIds = identities(projects, 'project');
  const userIds = identities(users, 'user');
  const pairs = new Set();
  for (const membership of memberships) {
    if (!projectIds.has(membership.projectId)) throw new Error('Orphan project reference');
    if (!userIds.has(membership.userId)) throw new Error('Orphan user reference');
    if (!['viewer', 'editor'].includes(membership.role)) throw new Error('Invalid role');
    const pair = JSON.stringify([membership.projectId, membership.userId]);
    if (pairs.has(pair)) throw new Error('Duplicate membership');
    pairs.add(pair);
  }
  return true;
}
```

The contract assumes arrays of record objects; it is an invariant exercise, not a complete untrusted-JSON parser. Notice which fields it does not validate. Future request and database validators must cover those boundaries rather than treating this function as universal protection.

## Try valid states and counterexamples

Fixtures are small known datasets. The valid example has the same user in two projects with different roles. Each invalid case changes one fact so the failure has an understandable cause.

```javascript file=test/membership-model.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMembershipModel } from '../server/membership-model.mjs';
const fixture = () => ({
  projects:[{id:'p1',name:'Workshop'},{id:'p2',name:'Workshop'}],
  users:[{id:'u1',email:'learner@example.test'}],
  memberships:[
    {projectId:'p1',userId:'u1',role:'editor'},
    {projectId:'p2',userId:'u1',role:'viewer'}
  ]
});
test('a user can have different roles in different projects', () => {
  assert.equal(validateMembershipModel(fixture()), true);
});
test('duplicate membership and orphan references are invalid', () => {
  const duplicate = fixture(); duplicate.memberships.push({...duplicate.memberships[0]});
  assert.throws(() => validateMembershipModel(duplicate), /Duplicate membership/);
  const orphan = fixture(); orphan.projects = orphan.projects.filter(p => p.id !== 'p1');
  assert.throws(() => validateMembershipModel(orphan), /Orphan project/);
  const missingUser = fixture(); missingUser.users = [];
  assert.throws(() => validateMembershipModel(missingUser), /Orphan user/);
});
test('role and entity identity are independent constraints', () => {
  const role = fixture(); role.memberships[0].role = 'anything';
  assert.throws(() => validateMembershipModel(role), /Invalid role/);
  const identity = fixture(); identity.users.push({...identity.users[0]});
  assert.throws(() => validateMembershipModel(identity), /Duplicate user/);
});
```

```check
run "node --test test/membership-model.test.js"
```

## Choose the physical document layout

Now apply workload reasoning. If membership is independently queried by user and project and may grow substantially, separate membership documents make those reads and growth explicit. A compound unique index on projectId/userId enforces the pair, while a query beginning with userId may need a differently ordered index. An index is not a foreign key. Embedding a small bounded set of collaborators could fit a different product, but you must state the bound and test update behavior.

Write down expected project sizes, membership growth, reads and writes before deciding. Do not convert an arbitrary example population into a universal size threshold. Define deletion: restrict it, remove dependent records, archive, or preserve a historical snapshot. Each policy has different consistency and retention consequences. A read-then-insert existence check can race a deletion; solving that requires more than calling this in-memory validator.

## Your turn: model equipment reservations

Design equipment, users and reservations. Identify candidate keys, relationship cardinalities, required/optional fields and dependencies. State whether a reservation records the current equipment name or a historical snapshot. Define valid start/end times, overlap rules, cancellation and deletion. Produce both a relational design and a document design, plus queries each must serve.

Write independent fixture tests for a missing equipment reference, a repeated reservation id, an invalid time interval and an overlapping booking. Explain why checking overlap before inserting does not prevent concurrent bookings. Save the models, observations and reasoning in evidence/database-design.txt. The file check is a submission gate only, not a judgment of model quality.

```hints
nudge: Begin with the promise made to the person reserving the equipment.
concept: Keys identify facts; invariants restrict which combinations of facts can coexist.
shape: Write a valid reservation and a conflicting one, trace their keys and interval boundaries, then identify the storage operation needed to enforce the rule under concurrency.
```

```check
file evidence/database-design.txt
```

## Diagnose, explain and review

Change the membership uniqueness key to userId alone. The valid-fixture test should fail. Restore the pair. Remove the project-reference check and watch the orphan test fail. Restore it. These checks establish model invariants for the fixtures; they do not prove any database enforces them atomically.

Without the reference, explain the difference between a logical relationship, a physical document layout, a unique index and a foreign key. Show a counterexample where a convenient embedded shape makes an important read or deletion harder. This is the reasoning you will need before the advanced MongoDB and secure-collaboration stages.
