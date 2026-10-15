---
title: MongoDB Constraints and Indexes
track: MEAN — MongoDB
runtime: none
---

Outcome: enforce stored document shapes and justify a compound index with an explain plan. Install MongoDB Community 8 locally using the [official guide](https://www.mongodb.com/docs/manual/installation/). Keep the service bound to loopback. This is a local single-operator teaching prototype, not a public service.

### The story so far

Continue after Database Design in the same task-board folder. The project has package.json, the installed dependencies, a tested input rule and design.md. Now translate the design into real storage rules.

## Connect and define storage rules

Start the local MongoDB service. The default URI is mongodb://127.0.0.1:27017 and the database is mean_task_board. To use another local port, set `$env:MONGO_URL="mongodb://127.0.0.1:27018"` in PowerShell or `export MONGO_URL="mongodb://127.0.0.1:27018"` in bash. No cloud account is required.

The driver translates JavaScript values to BSON. await pauses this async function until I/O finishes, not every request in Node. A validator protects writes outside Express too. The API still trims whitespace and controls client-writable fields. collMod changes future validation; it does not repair existing records. upsert inserts when the seed is absent, and $setOnInsert leaves an existing seed alone.

```javascript file=server/db.js
import { MongoClient, ObjectId } from 'mongodb';
export const projectId = new ObjectId('000000000000000000000001');
export async function connect(name = process.env.MONGO_DB || 'mean_task_board') {
  const client = new MongoClient(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017', {
    serverSelectionTimeoutMS: 3000
  });
  try {
    await client.connect();
    return { client, db: client.db(name) };
  } catch (error) {
    await client.close();
    throw error;
  }
}
export async function prepare(db) {
  const definitions = {
    projects: { bsonType: 'object', required: ['slug', 'name', 'schemaVersion'], properties: {
      slug: { bsonType: 'string', minLength: 1 }, name: { bsonType: 'string', minLength: 1 },
      schemaVersion: { enum: [1] }
    } },
    tasks: { bsonType: 'object', required: ['projectId', 'title', 'status', 'version', 'schemaVersion'], properties: {
      projectId: { bsonType: 'objectId' }, title: { bsonType: 'string', minLength: 1, maxLength: 100 },
      status: { enum: ['open', 'done'] },
      version: { bsonType: ['int', 'long', 'double'], minimum: 0, multipleOf: 1 },
      schemaVersion: { enum: [1] }
    } }
  };
  for (const [name, schema] of Object.entries(definitions)) {
    const validator = { $jsonSchema: schema };
    if (await db.listCollections({ name }).hasNext()) {
      await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
    } else {
      await db.createCollection(name, { validator });
    }
  }
  await db.collection('projects').createIndex({ slug: 1 }, { unique: true });
  await db.collection('tasks').createIndex({ projectId: 1, _id: 1 });
  await db.collection('projects').updateOne({ _id: projectId }, {
    $setOnInsert: { slug: 'workshop', name: 'Workshop', schemaVersion: 1 }
  }, { upsert: true });
}
```

## Apply the schema deliberately

Setup is an explicit command, not an operation on every HTTP request. Run npm run db:setup twice: the second run should retain one seeded project. The unique index rejects duplicate slugs even with concurrent inserts. Checking first in JavaScript cannot provide that guarantee.

```javascript file=server/setup.js
import { connect, prepare } from './db.js';
const { client, db } = await connect();
try {
  await prepare(db);
  console.log('Database ready');
} finally { await client.close(); }
```

```check
run "npm run db:setup" stdout="Database ready"
```

## Inspect the query shape

```predict
question: Does an index on title directly serve a projectId filter sorted by _id?
explain: No. Our compound index begins with the equality field projectId and ends with the sort field _id.
```

A compound index orders entries by several fields. explain reports how MongoDB plans and executes a query. Read executionStats.totalDocsExamined, nReturned and the winning plan. A tiny collection can produce a different plan; representative data matters more than merely having an index. Indexes cost storage and writes.

```javascript file=server/inspect.js
import { connect, projectId } from './db.js';
const { client, db } = await connect();
try {
  const plan = await db.collection('tasks').find({ projectId }).sort({ _id: 1 }).limit(20).explain('executionStats');
  console.log(JSON.stringify(plan, null, 2));
} finally { await client.close(); }
```

```check
run "npm run db:inspect"
```

## Your turn: index design

Suppose the screen filters by projectId and status, then sorts by _id. Propose an index and explain its field order. In a separate scratch collection, compare explain output with and without that index on representative data. Record documents examined and returned in evidence/index.txt. This file check is a submission gate only; an empty collection does not prove performance.

```hints
nudge: List the equality conditions before the sort requirement.
concept: A compound index has a leading prefix; reversing its fields changes which queries it serves.
shape: Compare {projectId: 1, status: 1, _id: 1} with a different order and include a query without status.
```

```check
file evidence/index.txt
```

## Diagnose, explain and review

Stop MongoDB, run db:setup and observe a connection failure after the selection timeout. Restore the service and rerun. Do not hide a connection error by replacing durable storage with an array. Setup verifies connectivity and schema commands, not backup recovery or foreign keys.

References: [schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/) and [compound indexes](https://www.mongodb.com/docs/manual/core/index-compound/).
