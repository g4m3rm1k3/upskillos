---
title: 1 — A TypeScript backend with delivery semantics
track: Backend Developer Bootcamp — NestJS — Webhook Inbox
trackOrder: 51.04
runtime: none
---

Build Parcel Inbox, a webhook receiver that accepts signed parcel events and processes them durably. This standalone section needs JavaScript functions, objects, promises and basic TypeScript reading skills; revisit the frontend JavaScript material if those are unfamiliar. Use Node 22.14 or later in the Node 22/24 lines, npm and Git. Node’s built-in SQLite API is experimental in the selected Node 22 baseline; it makes local persistence inspectable without installing a database daemon.

### The story so far

Start here in an empty project folder. This framework section stands alone; you do not need files from another backend section.

## Create an independent package

Choose an empty parcel-inbox folder. Run `node --version`, `npm --version`, then `npm install`. Commit package-lock.json after tests pass; use npm ci on a clean checkout. The package manifest declares compatible ranges; the lock records resolved versions. Nest supplies modules, providers and decorators on top of Node. It does not make an unreliable external sender reliable by itself.

npm runs scripts from the package root. `pwd` or PowerShell `Get-Location` diagnoses the common error of installing dependencies into a different project. This project deliberately uses CommonJS output; do not add type: module without changing the compiler and tests too.

```json file=package.json
{
  "name": "parcel-inbox", "version": "1.0.0", "private": true,
  "scripts": {"build": "tsc", "start": "node dist/main.js", "worker": "node dist/worker.js", "test": "npm run build && node --test test/*.test.cjs"},
  "dependencies": {"@nestjs/common": "^11.0.0", "@nestjs/core": "^11.0.0", "@nestjs/platform-express": "^11.0.0", "reflect-metadata": "^0.2.2", "rxjs": "^7.8.0", "class-validator": "^0.14.0", "class-transformer": "^0.5.1"},
  "devDependencies": {"typescript": "^5.7.0", "@types/node": "^22.0.0", "@types/express": "^5.0.0"}
}
```


```predict
question: Does HTTP 202 mean the parcel event has already been processed?
choice: No
choice: Yes
answer: No
explain: Here it acknowledges durable acceptance for later processing.
```

## Configure the compiler

Decorators attach metadata used by Nest for dependency injection and routing. emitDecoratorMetadata lets the container see constructor parameter types. TypeScript types disappear at runtime, so we still need input validation. The compiler reads src and writes dist; edit source, then build. dist is not the source of truth.

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022", "module": "commonjs", "outDir": "dist", "rootDir": "src",
    "experimentalDecorators": true, "emitDecoratorMetadata": true,
    "strict": true, "esModuleInterop": true, "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```


## Protect generated state

Run git init and inspect git status. Keep the lockfile; ignore credentials and the inbox database. Before running the server later, set WEBHOOK_SECRET to at least 32 random bytes represented as text. Generate with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`; set it using export on macOS/Linux or `$env:WEBHOOK_SECRET='...'` in PowerShell. Never commit its value.

```text file=.gitignore
node_modules/
dist/
*.db
.env
```


## Define what acceptance means

A webhook sender may retry because it never received your response. 202 will mean the event is durably stored for later processing, not that the business effect is complete. Our initial effect is a local receipt ledger; it does not send external messages. The sender signs timestamp + dot + exact body bytes with HMAC-SHA256. Both sides must agree on this protocol; it is a course protocol, not an assumed carrier standard.

## Your turn: write a delivery timeline

Draw sender → HTTP receiver → inbox → worker → receipt. Mark where a crash can occur and whether the sender should retry. Identify the durable acknowledgment point and explain why returning 202 before writing the row can lose an event.

Write your evidence in `evidence/setup.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/setup.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If node:sqlite is unavailable, inspect the selected Node version before replacing it with an in-memory array. Explain the event loop and why synchronous SQLite is an explicit low-volume prototype tradeoff.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
