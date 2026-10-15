---
title: Query Workshop — Discover the Cost of Duplication
runtime: none
---

Outcome: observe an update anomaly and compare a join with a denormalized read. A join combines related records using a shared key. Denormalization deliberately duplicates data to simplify a read, while accepting extra maintenance on writes.

### The story so far

You have a proposed schema, but no evidence for its tradeoffs. This workshop uses plain JavaScript before adding MongoDB. Keep the same task-board folder. A small array is a model of data relationships, not a replacement for durable storage.

## Make the problem visible

Two tasks belong to the same project. If each stores its project name, a rename requires updating both. Predict the result before running `node server/model-demo.js`.

```predict
question: After renaming only the first copied projectName, do both tasks agree on the project name?
explain: No. The copied strings have no connection. Sharing a projectId allows a read to obtain the name from one authoritative project record instead.
```

```javascript file=server/model-demo.js
const copied = [
  { title: 'Sketch', projectName: 'Workshop' },
  { title: 'Test', projectName: 'Workshop' }
];
copied[0].projectName = 'Studio';
console.log('Copied names:', copied.map(task => task.projectName).join(', '));
const projects = new Map([['p1', { name: 'Workshop' }]]);
const tasks = [{ title: 'Sketch', projectId: 'p1' }, { title: 'Test', projectId: 'p1' }];
projects.get('p1').name = 'Studio';
console.log('Referenced names:', tasks.map(task => projects.get(task.projectId).name).join(', '));
```

```check
run "node server/model-demo.js" stdout="Referenced names: Studio, Studio"
```

## Explain the tradeoff

The copied version reads directly, but a rename can leave inconsistent names: an update anomaly. The referenced version stores one authoritative name and performs a lookup when reading. In a database that may mean another request or an aggregation join. The right choice depends on how frequently names change, how they are read and whether historical values must be preserved.

A purchase receipt is a useful counterexample: the price paid should usually remain a historical snapshot even when a product's current price changes. Duplicated data is not automatically a modeling mistake. Decide which value is authoritative and whether changes should propagate.

## Your turn: historical snapshots

In a separate model-exercise.js, model a product and two purchase lines. Change the current price. Assert that a current catalog view reflects the change while both purchase totals retain their original prices. Explain why the rules differ from a project rename. Save results and reasoning in evidence/snapshots.txt. This file check is a submission gate only.

```hints
nudge: Ask what a receipt is promising to remember.
concept: A reference expresses current identity; a snapshot captures a fact at a specific time.
shape: Keep productId and pricePaid on each purchase line, then calculate totals from pricePaid.
```

```check
file evidence/snapshots.txt
```

## Diagnose, explain and review

Change a task's projectId to p2 without adding that project. The lookup fails because get returns undefined. Locate the offending id, then restore p1. Explain whether your eventual API should reject the write or display an explicit missing-reference state. The output check establishes the demonstrated names only; it does not measure database query cost or validate your independent model.
