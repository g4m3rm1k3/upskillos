---
title: 2 — Validate structure and authenticate bytes
track: Backend Developer Bootcamp — NestJS — Webhook Inbox
trackOrder: 51.04
runtime: none
---

Outcome: distinguish validation from authentication. A structurally valid JSON event can still be forged.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Describe the accepted event

A class survives at runtime; a TypeScript interface does not. The validation decorators constrain event id, parcel id and event kind. `!` tells the compiler these properties will be populated by the framework; it does not prove the input is valid. A DTO is a public contract, not a database schema.

```typescript file=src/event.dto.ts
import { IsIn, IsString, Matches, MaxLength } from 'class-validator';
export class ParcelEvent {
  @IsString() @Matches(/^[a-zA-Z0-9-]{1,80}$/)
  eventId!: string;
  @IsString() @MaxLength(80) @Matches(/^[a-zA-Z0-9-]+$/)
  parcelId!: string;
  @IsIn(['dispatched', 'delivered'])
  kind!: 'dispatched' | 'delivered';
}
```


```predict
question: Can JSON.parse followed by JSON.stringify preserve every sender’s signed bytes?
choice: No
choice: Yes
answer: No
explain: Whitespace and key ordering can change while the JSON value remains equivalent.
```

## Verify the sender

HMAC authenticates exact bytes with a shared secret. Re-serializing parsed JSON can alter whitespace or key order and break signature verification. Check the timestamp window and hexadecimal length before the constant-time comparison; timingSafeEqual requires equal-sized buffers. The timestamp is included in the signed message so an attacker cannot simply refresh an old header.

A five-minute freshness window limits replay age; it does not deduplicate replays inside that window. Durable event ids will handle that next. The server clock is part of this protocol and needs monitoring. One secret represents one sender in this prototype. Multiple providers require a configured provider identity, separate keys and provider-scoped event uniqueness.

Reference: [Nest raw request body](https://docs.nestjs.com/faq/raw-body).

```typescript file=src/signature.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, RawBodyRequest } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

@Injectable()
export class SignatureGuard implements CanActivate {
  private readonly secret: string;
  constructor() {
    this.secret = process.env.WEBHOOK_SECRET ?? '';
    if (Buffer.byteLength(this.secret) < 32) throw new Error('WEBHOOK_SECRET must contain at least 32 bytes');
  }
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const timestamp = request.get('X-Event-Time') ?? '';
    const signature = request.get('X-Event-Signature') ?? '';
    if (!/^\d{10}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature) || !request.rawBody) {
      throw new UnauthorizedException('invalid signature');
    }
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new UnauthorizedException('expired event');
    const expected = createHmac('sha256', this.secret).update(timestamp + '.').update(request.rawBody).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new UnauthorizedException('invalid signature');
    return true;
  }
}
```


## Plan rotation and limits

Rotate with a bounded overlap between active and retiring keys, then remove the retired key. Do not select arbitrary keys or URLs from untrusted JSON. TLS still matters: signatures authenticate but do not encrypt. Apply body limits before expensive parsing and enforce request-rate budgets at ingress. A signature guard does not stop volumetric denial of service.

## Your turn: prove tampering is rejected

Construct one event and its signature. Change one byte of the body without recomputing the signature and expect 401. Then sign a structurally invalid event correctly and expect 400. Explain why both failures are necessary and belong to different boundaries.

Write your evidence in `evidence/trust.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/trust.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If genuine signatures fail, compare the exact raw bytes and timestamp string on each side. Do not fix this by parsing and sorting JSON unless both sides intentionally adopt a canonicalization protocol.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
