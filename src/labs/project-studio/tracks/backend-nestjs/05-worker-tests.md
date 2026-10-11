---
title: 5 — Crash boundaries and idempotent effects
track: Backend Developer Bootcamp — NestJS — Webhook Inbox
trackOrder: 51.04
runtime: none
---

Outcome: process one durable event in a transaction and test signatures, replay, restart and worker behavior.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Implement a finite worker

Run this only after the receiver has initialized the schema. `npm run worker` processes at most one event and exits. BEGIN IMMEDIATE serializes local SQLite writers; the ledger insert and status update share the transaction. A crash before commit leaves both undone; after commit both are durable. Running the worker again cannot add the same receipt twice.

This guarantee applies to effects inside this database. A remote email or payment cannot join the SQLite transaction. For remote effects use a persisted delivery state, bounded retries, provider idempotency keys and reconciliation. Do not advertise universal exactly-once delivery. Also distinguish event receipt from current parcel state: out-of-order dispatched/delivered events need explicit version or transition rules before updating a tracking projection.

```typescript file=src/worker.ts
import { DatabaseSync } from 'node:sqlite';
import { ParcelEvent } from './event.dto';
const db = new DatabaseSync(process.env.INBOX_DB ?? 'inbox.db');
try {
  db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
  const row = db.prepare("SELECT event_id,payload FROM inbox WHERE status='pending' ORDER BY rowid LIMIT 1").get() as
    { event_id: string; payload: string } | undefined;
  if (row) {
    const event = JSON.parse(row.payload) as ParcelEvent;
    db.prepare('INSERT INTO receipts VALUES (?,?,?)').run(row.event_id, event.parcelId, event.kind);
    db.prepare("UPDATE inbox SET status='done' WHERE event_id=?").run(row.event_id);
  }
  db.exec('COMMIT');
  console.log(row ? 'processed one event' : 'no pending events');
} catch (error) {
  if (db.isTransaction) db.exec('ROLLBACK');
  throw error;
} finally { db.close(); }
```


```predict
question: Can this SQL transaction roll back an email already sent to another service?
choice: No
choice: Yes
answer: No
explain: The remote effect is outside this database transaction.
```

## Exercise the whole path

Run `npm test`. The suite compiles TypeScript, starts a temporary loopback listener and closes it in finally. It uses a temporary database and a test-only secret. It checks missing, expired and wrong signatures, DTO validation, body limits, changed-payload conflict, persisted replay after restart and one ledger effect after two worker runs.

A successful 202 alone is insufficient evidence; the test queries persisted state after processing. The worker runs as a separate process to exercise the actual command, not a reimplementation inside the test.

```text file=test/inbox.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { createApp } = require('../dist/bootstrap');

test('signature, validation, replay, restart and worker effect', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'parcel-inbox-'));
  process.env.WEBHOOK_SECRET = 'test-only-secret-with-more-than-thirty-two-bytes';
  process.env.INBOX_DB = join(dir, 'test.db');
  let app;
  try {
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    let url = await app.getUrl();
    const body = JSON.stringify({ eventId:'event-1', parcelId:'parcel-1', kind:'dispatched' });
    async function send(raw = body, age = 0, tamper = false) {
      const timestamp = String(Math.floor(Date.now()/1000) - age);
      const signature = createHmac('sha256', process.env.WEBHOOK_SECRET).update(timestamp+'.'+raw).digest('hex');
      return fetch(url+'/events', { method:'POST', headers: { 'Content-Type':'application/json',
        'X-Event-Time':timestamp, 'X-Event-Signature':tamper ? '0'.repeat(64) : signature }, body:raw });
    }
    assert.equal((await fetch(url+'/events', {method:'POST', headers:{'Content-Type':'application/json'}, body})).status, 401);
    assert.equal((await send(body, 600)).status, 401);
    assert.equal((await send(body, 0, true)).status, 401);
    assert.equal((await send(JSON.stringify({eventId:'bad',parcelId:'x',kind:'unknown'}))).status, 400);
    assert.equal((await send(JSON.stringify({eventId:'bad',parcelId:'x',kind:'delivered',admin:true}))).status, 400);
    assert.equal((await send(' '.repeat(17000) + body)).status, 413);
    const first = await send();
    assert.equal(first.status, 202);
    assert.equal((await first.json()).duplicate, false);
    assert.equal((await (await send()).json()).duplicate, true);
    assert.equal((await send(body.replace('dispatched','delivered'))).status, 409);
    await app.close();
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    assert.equal((await (await send()).json()).duplicate, true);
    for (let i=0;i<2;i++) {
      const worker = spawnSync(process.execPath, ['dist/worker.js'], {env:process.env,encoding:'utf8'});
      assert.equal(worker.status, 0, worker.stderr);
    }
    const db = new DatabaseSync(process.env.INBOX_DB);
    try {
      assert.equal(db.prepare('SELECT count(*) AS n FROM receipts').get().n, 1);
      assert.equal(db.prepare("SELECT count(*) AS n FROM inbox WHERE status='done'").get().n, 1);
    } finally { db.close(); }
  } finally {
    if (app) await app.close();
    rmSync(dir, {recursive:true,force:true});
  }
});
```


## Classify retryable errors

A 400 indicates a bad event shape; 401 indicates sender authentication failure; 409 indicates conflicting use of an event id; 413 indicates an oversized body. Blindly retrying these unchanged requests will not fix them. Timeouts and selected 5xx responses may merit bounded exponential backoff with jitter. Include a dead-letter/review path and retry budget so poison messages do not starve useful work.

## Your turn: simulate a worker crash

Add a deliberate failure between receipt insertion and marking the inbox done. Assert neither change persists, then remove the failure and retry. Run two worker processes against pending events and verify each receipt appears once. Next design the different guarantee needed for an external email provider.

Write your evidence in `evidence/worker-tests.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/worker-tests.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Run the regression suite

Run from this project’s root with its tools installed. A nonzero exit means stop and read the first failure. These are finite tests; no manually running server is required.

```check
run "npm test"
```

## Diagnose, explain and review

If tests hang, inspect unclosed listeners or database connections. A test timeout is not evidence of delivery correctness. Explain why timestamp validation and event deduplication are complementary.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
