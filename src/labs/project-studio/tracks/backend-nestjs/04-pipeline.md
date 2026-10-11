---
title: 4 — Compose modules, guards and pipes
track: Backend Developer Bootcamp — NestJS — Webhook Inbox
trackOrder: 51.04
runtime: none
---

Outcome: connect the HTTP adapter to signature verification, runtime validation and durable acceptance.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Declare the module and controller

The module declares what Nest constructs. Constructor injection gives the controller its inbox service. A guard decides whether a request can proceed; a pipe validates/transforms input. The controller chooses HTTP 202 and delegates the write. The non-null rawBody assertion relies on the preceding guard; removing that guard changes the precondition and must fail security tests.

Providers, controllers, guards, pipes and interceptors solve different problems. Use an interceptor for cross-cutting response timing, not to hide business-state transitions.

```typescript file=src/app.module.ts
import { Controller, HttpCode, Module, Post, Body, Req, UseGuards, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { ParcelEvent } from './event.dto';
import { SignatureGuard } from './signature.guard';
import { InboxService } from './inbox.service';

@Controller('events')
class EventsController {
  constructor(private readonly inbox: InboxService) {}
  @Post() @HttpCode(202) @UseGuards(SignatureGuard)
  receive(@Body() event: ParcelEvent, @Req() request: RawBodyRequest<Request>) {
    return this.inbox.accept(event, request.rawBody!);
  }
}

@Module({ controllers: [EventsController], providers: [SignatureGuard, InboxService] })
export class AppModule {}
```


```predict
question: Does compiling a TypeScript DTO validate incoming JSON at runtime?
choice: No
choice: Yes
answer: No
explain: Runtime validation requires the configured pipe and decorators.
```

## Build a testable bootstrap

rawBody preserves the bytes needed for HMAC. The JSON parser limits body size before controller execution. ValidationPipe rejects undeclared properties and checks decorators; TypeScript compile-time types cannot reject hostile network input. Reference: [Nest validation](https://docs.nestjs.com/techniques/validation).

The factory returns an app without choosing a port, which lets tests use an ephemeral loopback listener. Shutdown hooks close resources. Logging is disabled for the minimal reference; add explicit sanitized operational logging before deployment rather than dumping webhook bodies.

```typescript file=src/bootstrap.ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true, logger: false, abortOnError: false });
  app.useBodyParser('json', { limit: '16kb' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  return app;
}
```


## Start the local receiver

Run `npm run build`, then `npm start` with WEBHOOK_SECRET configured. Expect the loopback URL. POST an unsigned JSON event and observe 401; a GET on /events is not a mutation endpoint. Stop with Ctrl+C. We add a finite signed-request suite next so you do not need to hand-build HMACs in a terminal.

Nest can use Express or Fastify adapters. Raw-body and parser configuration are adapter-specific; this reference selects Express explicitly. Do not switch adapters without updating and rerunning the body-limit and signature cases.

```typescript file=src/main.ts
import { createApp } from './bootstrap';
async function main() {
  const app = await createApp();
  await app.listen(8003, '127.0.0.1');
  console.log('Parcel Inbox listening on http://127.0.0.1:8003');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
```


## Your turn: add sanitized correlation

Generate a correlation id per request and log route, status and duration without the signature, secret or payload. Decide whether to accept a caller-supplied id; validate and bound it if you do. Verify a failure can be traced across acceptance and worker processing using an event id with an explicit privacy policy.

Write your evidence in `evidence/pipeline.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/pipeline.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If extra JSON fields are silently accepted, inspect the global validation pipe rather than adding TypeScript interfaces. Explain the order of body parsing, signature guard, validation and controller invocation.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
