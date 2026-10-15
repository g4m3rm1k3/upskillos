---
title: Integration Tests and Schema Evolution
track: MEAN — Testing and Evolution
runtime: none
---

Outcome: demonstrate a race with real concurrent requests and plan a migration that runs twice safely. Integration tests connect components through real boundaries. Unit tests isolate a small rule. Neither replaces independent learner evidence.

### The story so far

Continue after Angular in the same folder. The browser, Express and MongoDB now form a complete local app. Stop the manually started API; keep MongoDB running for these finite checks.

## Test the actual storage boundary

The test starts a listener on an available port, creates a unique mean_test_* database and deletes only that test database in finally. Do not use production credentials. A missing MongoDB service fails the test rather than skipping storage checks.

Tests send real HTTP and inspect stored documents. Concurrent responses may finish in either order; the rule is one success and one conflict. The page test checks bounded, disjoint results. Database-level rejection tests bypass the API to prove validation and uniqueness are actually enforced in storage.

```javascript file=test/integration.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { connect, prepare, projectId } from '../server/db.js';
import { createApp } from '../server/app.js';
test('HTTP and MongoDB contracts', async t => {
  const name = 'mean_test_' + randomUUID().replaceAll('-', '');
  const { client, db } = await connect(name);
  let server;
  try {
    await prepare(db);
    server = createApp(db).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const path = '/api/projects/' + projectId + '/tasks';
    const request = (url, method = 'GET', body) => fetch(base + url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    await t.test('invalid input and missing projects leave no records', async () => {
      assert.equal((await request(path, 'POST', { title: { $ne: '' } })).status, 400);
      assert.equal((await request('/api/projects/bad/tasks')).status, 400);
      assert.equal((await request('/api/projects/' + new ObjectId() + '/tasks', 'POST', {title:'x'})).status, 404);
      assert.equal(await db.collection('tasks').countDocuments(), 0);
    });
    let task;
    await t.test('creation owns metadata and persists the trimmed title', async () => {
      const response = await request(path, 'POST', { title: ' Plan ', status: 'done', version: 99 });
      assert.equal(response.status, 201); task = await response.json();
      assert.equal(task.title, 'Plan'); assert.equal(task.version, 0); assert.equal(task.status, 'open');
      const stored = await db.collection('tasks').findOne({ _id: new ObjectId(task._id) });
      assert.equal(stored.title, 'Plan');
    });
    await t.test('concurrent stale writers cannot both succeed', async () => {
      const replies = await Promise.all(['done', 'open'].map(status => request(path + '/' + task._id, 'PATCH', {status, version:0})));
      assert.deepEqual(replies.map(r => r.status).sort(), [200, 409]);
      assert.equal((await db.collection('tasks').findOne({_id:new ObjectId(task._id)})).version, 1);
      const wrong = '/api/projects/' + new ObjectId() + '/tasks/' + task._id;
      assert.equal((await request(wrong, 'PATCH', {status:'done',version:1})).status, 409);
    });
    await t.test('validators and unique indexes reject bypass writes', async () => {
      await assert.rejects(db.collection('tasks').insertOne({title:'incomplete'}), e => e.code === 121);
      await assert.rejects(db.collection('projects').insertOne({slug:'workshop',name:'Duplicate',schemaVersion:1}), e => e.code === 11000);
    });
    await t.test('pagination returns bounded disjoint pages', async () => {
      for (let i=0; i<22; i++) assert.equal((await request(path,'POST',{title:'Task '+i})).status,201);
      const first = await (await request(path)).json();
      assert.equal(first.items.length,20); assert.ok(first.next);
      const second = await (await request(path+'?after='+first.next)).json();
      assert.equal(second.items.length,3); assert.equal(second.next,null);
      assert.equal(new Set([...first.items,...second.items].map(row=>row._id)).size,23);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    try { await db.dropDatabase(); } finally { await client.close(); }
  }
});
```

```check
run "npm test"
```

## Plan an additive migration

```predict
question: Does applying a stricter validator add missing fields to old documents?
explain: No. A validator controls writes. A backfill must update existing records deliberately, with compatibility planned before requiring the new field.
```

Suppose tasks gain priority. Use expand → backfill → enforce: deploy readers that default missing priority to normal, then writers that supply it, backfill missing values, verify, and finally require it. Old writers can keep creating old-shaped data during rollout; stop them or support both shapes until they are gone.

Idempotent means rerunning has the same final effect. Filtering on missing priority makes the backfill repeatable. Use a scratch collection so the guided schema stays intact. A production backfill also needs bounded batches, observability and recovery from interruption.

```javascript file=server/migration-practice.js
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connect } from './db.js';
const { client, db } = await connect('mean_test_' + randomUUID().replaceAll('-', ''));
try {
  const tasks = db.collection('migration_practice');
  await tasks.insertMany([{title:'Old',schemaVersion:1},{title:'New',priority:'high',schemaVersion:2}]);
  const migrate = () => tasks.updateMany({priority:{$exists:false}}, {$set:{priority:'normal',schemaVersion:2}});
  assert.equal((await migrate()).modifiedCount,1);
  assert.equal((await migrate()).modifiedCount,0);
  assert.equal((await tasks.findOne({title:'New'})).priority,'high');
  console.log('Migration is repeatable');
} finally {
  try { await db.dropDatabase(); } finally { await client.close(); }
}
```

```check
run "node server/migration-practice.js" stdout="Migration is repeatable"
```

## Your turn: capstone

Extend your own copy with priority end to end: data contract, backward-compatible reads, validated writes, Angular input, migration and regressions. Choose an index from an access pattern and justify its write cost. Reject a malformed priority and read a pre-migration document in your tests. Demonstrate migration twice and explain rollback if new data cannot fit the old schema.

Record observed results, reasoning and independently written tests in evidence/capstone.txt. This file check is a submission gate only. Have a reviewer run the new behavior without the reference.

```hints
nudge: Begin by reading a task that has no priority field.
concept: Read compatibility must exist before new writes and backfills change stored shapes.
shape: Add a default at the read boundary, validate new values, backfill only missing fields, and test a second run.
```

```check
file evidence/capstone.txt
```

## Diagnose, explain and review

Remove the unique option from the slug index in a fresh scratch database and rerun the duplicate test: it should fail. Reapplying createIndex to an existing index does not remove uniqueness. Restore the definition and rebuild only the scratch database.

Final demonstration: add a task in Angular, restart Express, reload and show the same stored record. Demonstrate a stale edit across two tabs. Trace a value through Angular, HTTP, Express and MongoDB without the reference. Automated checks cover authored examples, not accessibility, all malformed requests or performance under load.

Before public deployment, add identity and per-project authorization, secure sessions, throttling, HTTPS, least-privilege database credentials, operational logging and tested backup/restore. Static hosting alone cannot run Express or MongoDB. Authentication, multi-document transactions and deployment are required later stages of the expanded curriculum, not features claimed by this local app. Their full lessons are not yet authored; the following mastery checkpoint makes the remaining scope explicit.
