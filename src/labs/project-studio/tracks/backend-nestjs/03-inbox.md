---
title: 3 — Persist before acknowledgment
track: Backend Developer Bootcamp — NestJS — Webhook Inbox
trackOrder: 51.04
runtime: none
---

Outcome: accept duplicate deliveries without duplicate work and detect an event id reused for different content.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Implement durable acceptance

The primary key arbitrates concurrent delivery. INSERT ON CONFLICT avoids an unsafe “check then insert” race. The stored digest detects a changed payload with the same event id. This version intentionally compares exact body bytes: even whitespace changes on a retry produce 409. Document that contract for the sender; semantic normalization would be a different protocol decision.

Payload is serialized only after DTO validation; the digest still refers to the authenticated raw body. Keep the inbox immutable until its documented retention window ends. Deleting a row early can let an old event become new again. The receipt table holds business effects separately from transport bookkeeping.

The synchronous database blocks Node's event loop during operations. This is acceptable for the small local reference workload, not a throughput claim. Moving to PostgreSQL with an async driver requires retesting transactions and worker claims; it is not a one-line performance toggle.

```typescript file=src/inbox.service.ts
import { ConflictException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { ParcelEvent } from './event.dto';

@Injectable()
export class InboxService implements OnModuleDestroy {
  private readonly db: DatabaseSync;
  constructor() {
    this.db = new DatabaseSync(process.env.INBOX_DB ?? 'inbox.db');
    this.db.exec(`
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS inbox (
        event_id TEXT PRIMARY KEY, digest TEXT NOT NULL, payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done'))
      );
      CREATE TABLE IF NOT EXISTS receipts (event_id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL, kind TEXT NOT NULL);
      PRAGMA user_version=1;
    `);
  }
  accept(event: ParcelEvent, raw: Buffer): { accepted: boolean; duplicate: boolean } {
    const digest = createHash('sha256').update(raw).digest('hex');
    const inserted = this.db.prepare('INSERT INTO inbox(event_id,digest,payload) VALUES (?,?,?) ON CONFLICT(event_id) DO NOTHING')
      .run(event.eventId, digest, JSON.stringify(event));
    const row = this.db.prepare('SELECT digest FROM inbox WHERE event_id=?').get(event.eventId) as { digest: string };
    if (row.digest !== digest) throw new ConflictException('event id reused with different bytes');
    return { accepted: true, duplicate: inserted.changes === 0 };
  }
  onModuleDestroy(): void { this.db.close(); }
}
```


```predict
question: Is an in-memory Set enough to deduplicate after process restart?
choice: No
choice: Yes
answer: No
explain: Only persisted state can remember the previously accepted event.
```

## Separate infrastructure from policy

Nest providers are injectable services. The inbox provider owns this database connection and closes it when the module is destroyed. A controller should not reach into SQL details or store an event in a process-global array. Shared memory disappears on restart and cannot coordinate separate instances.

Write a data dictionary for event_id, digest, payload and status. Distinguish transport identity (event id), domain identity (parcel id), authentication identity (configured sender) and request correlation id. Combining these identities creates subtle retry and permission errors.

## Your turn: design multiple senders

Extend uniqueness to (provider_id, event_id), where provider_id comes from trusted key configuration. Test two providers legitimately using the same event id, one provider replaying an event, and a caller trying to choose another provider in its body. Explain how key rotation preserves provider identity.

Write your evidence in `evidence/inbox.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/inbox.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If a replay produces a second receipt after restart, inspect whether deduplication was durable and whether retention removed the key. Explain why a Redis cache alone needs an explicit durability and eviction argument.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
