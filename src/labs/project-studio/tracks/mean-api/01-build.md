---
title: Express APIs and Concurrent Edits
track: MEAN — Express API
runtime: none
---

Outcome: implement bounded HTTP reads and show why two stale writers cannot both update a task. HTTP is the request/response protocol between browser and server. A route maps a method and path to a handler. Express 5 forwards rejected async handlers to error middleware.

### The story so far

Continue after MongoDB in the same folder. The schema and seeded project exist. Keep MongoDB running. Now connect the input rule to storage through HTTP.

## Build the request boundary

Creation accepts a title; editing accepts status and version. Never spread a request into a MongoDB query: a client-supplied object containing $ne is not an identifier. JSON parsing runs before routes, with a size limit. Status 201 means created, 400 invalid input, 404 no such project and 409 a conflict requiring a reload.

Pagination returns at most 20 items and a next cursor. Fetching one extra item tells us whether another page exists. _id gives a unique deterministic ordering, not exact creation-time ordering across clients. A live paged list is not a frozen snapshot.

The update predicate includes the old version. MongoDB tests and changes a single document atomically, so another request cannot slip between a separate read and write. A transaction groups several documents; this write does not require one.

```javascript file=server/app.js
import express from 'express';
import { ObjectId } from 'mongodb';
import { taskInput } from './rules.js';
function id(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) {
    throw Object.assign(new Error('Invalid id'), { status: 400 });
  }
  return new ObjectId(value);
}
const wire = task => ({ ...task, _id: String(task._id), projectId: String(task.projectId) });
export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb' }));
  app.get('/api/projects/:projectId/tasks', async (req, res) => {
    const projectId = id(req.params.projectId);
    const query = { projectId };
    if (req.query.after !== undefined) query._id = { $gt: id(req.query.after) };
    const rows = await db.collection('tasks').find(query).sort({ _id: 1 }).limit(21).toArray();
    const items = rows.slice(0, 20);
    res.json({ items: items.map(wire), next: rows.length > 20 ? String(items.at(-1)._id) : null });
  });
  app.post('/api/projects/:projectId/tasks', async (req, res) => {
    const projectId = id(req.params.projectId);
    if (!await db.collection('projects').findOne({ _id: projectId })) {
      return res.status(404).json({ error: 'Project not found' });
    }
    let input;
    try { input = taskInput(req.body); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const task = { ...input, projectId, status: 'open', version: 0, schemaVersion: 1 };
    const result = await db.collection('tasks').insertOne(task);
    res.status(201).json(wire({ ...task, _id: result.insertedId }));
  });
  app.patch('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
    const projectId = id(req.params.projectId), _id = id(req.params.taskId);
    const { status, version } = req.body || {};
    if (!['open', 'done'].includes(status) || !Number.isSafeInteger(version) || version < 0) {
      return res.status(400).json({ error: 'Expected status and nonnegative integer version' });
    }
    const task = await db.collection('tasks').findOneAndUpdate(
      { _id, projectId, version }, { $set: { status }, $inc: { version: 1 } }, { returnDocument: 'after' }
    );
    if (!task) return res.status(409).json({ error: 'Task missing or changed; reload before retrying' });
    res.json(wire(task));
  });
  app.use((error, req, res, next) => {
    const status = error.status === 400 || error.status === 413 ? error.status : 500;
    res.status(status).json({ error: status === 500 ? 'Storage unavailable' : 'Invalid request' });
  });
  return app;
}
```

## Listen locally and close cleanly

Keep the database connection open for the server lifetime. Ctrl+C sends the SIGINT signal. Close the listener first to let active requests finish, then close MongoDB. Run npm start after db:setup. Open http://127.0.0.1:3000/api/projects/000000000000000000000001/tasks and expect an items array. Stop with Ctrl+C when done. Indefinite servers do not belong in Check my work commands.

```javascript file=server/main.js
import { connect } from './db.js';
import { createApp } from './app.js';
const { client, db } = await connect();
const server = createApp(db).listen(3000, '127.0.0.1', () => console.log('API on http://127.0.0.1:3000'));
server.on('error', async error => { console.error(error.message); await client.close(); process.exitCode = 1; });
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (stopping) return;
  stopping = true;
  server.close(async () => { await client.close(); });
});
```

```check
run "node --check server/app.js"
run "node --check server/main.js"
```

## Reason about a lost update

```predict
question: Two clients both read version 0 and PATCH version 0. How many should succeed?
explain: One. The first successful write increments version to 1, so the second predicate no longer matches and returns 409.
```

Reading the version in JavaScript and updating by _id alone lets both readers see 0 before either writes. Keep the condition inside findOneAndUpdate. Scoping by projectId prevents edits through a different project URL, but is not user authorization. There are no accounts here. Public deployment requires verified user identity and access checks on every route.

Work through this timeline with a pencil before using two browser tabs:

| Event | Client A | Client B | Stored version |
|---|---|---|---|
| Both load | Holds open, version 0 | Holds open, version 0 | 0 |
| A writes done | Matches version 0; succeeds | Still holds version 0 | 1 |
| B writes open | Already finished | Cannot match version 0; gets 409 | 1 |
| B reloads | — | Learns done, version 1 | 1 |

This is optimistic concurrency: readers do not lock a record while thinking. Writers prove their read is still current. A conflict is expected behavior, not proof that the server broke. Decide whether the UI should discard, merge or ask about the stale intent; our first implementation asks for a reload.

## Your turn: HTTP contract

Write a matrix of method, URL, JSON and expected status for a valid create, an object-valued title, an invalid id and a stale edit. Write an independent Node fetch script for at least two cases. Explain what a 409 client should do before retrying. Save observations and reasoning in evidence/http.txt; this is a submission gate only.

```hints
nudge: Compare a malformed request with a valid request based on an old revision.
concept: Validation and concurrency failures belong to different contracts.
shape: Create once, retain version 0, patch twice with that version, and compare response statuses.
```

```check
file evidence/http.txt
```

## Diagnose, explain and review

Temporarily omit version from the update filter and run the concurrency test in chapter 6: both writes should succeed and the test should fail. Restore the filter. These syntax checks establish parseable JavaScript only; chapter 6 exercises real HTTP and storage together.

References: [Express 5](https://expressjs.com/en/5x/api/) and [MongoDB atomic writes](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/).
