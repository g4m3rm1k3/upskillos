# Backend Lab — A Backend, Built From Nothing, One Felt Need at a Time

## What You Will Build

A real backend: a router, controllers, middleware, a service layer,
persistence backed by a genuine SQLite database compiled to WebAssembly,
a hand-built query engine, repositories, dependency injection, and real
authentication with hashed passwords and session tokens. Not a toy that
pretends to be a backend — every mechanism this project builds is the
actual mechanism real frameworks are built from, just written by hand,
once, so the framework never has to be taken on faith.

This project runs entirely inside **Backend Lab**, a dedicated three-pane
tool: a lesson pane, a multi-file JavaScript editor, and a Postman-style
request pane (with a real SQL console once lesson 13 arrives). There is
no terminal, no `npm`, and no `git` anywhere in this environment — see
lesson 01's "The Environment, Named Honestly" section for exactly what
that means and why.

## Lesson Standard

Every lesson in this project must meet the
[Lesson Contract](../../../docs/LESSON_CONTRACT.md), at full strength:
nothing assumed beyond a variable and a loop, every concept explained at
first use, CS lens and SE lens (and PL lens, where the language itself
is the point) on every non-trivial block, a real, honest failure shown
before its fix, and maximum extraction — every concept a piece of code
actually embodies gets named, not just the one the lesson happens to be
about.

## The One Idea That Organises This Whole Project

> **Every layer knows only about the layer directly below it, and
> nothing else.**

```
Router  -->  Controller  -->  Service  -->  Repository  -->  db
```

The router only knows how to match a path and method to a handler. A
controller only knows how to turn an HTTP request into a call against a
service, and a service's answer back into an HTTP response. A service
only knows business rules — it has never heard of HTTP. A repository
only knows how to fetch and store data — it has never heard of a
business rule. `db` is the only thing that knows SQL exists at all.

This isn't a rule imposed for tidiness — it's what makes lesson 13
possible at all: replacing convenience database calls with student-written SQL
against the same SQLite database (compiled to WebAssembly) touches exactly one file,
`usersRepository`, and nothing above it. Every layer in this project
was built for a reason lesson 1 through lesson 12 each made you feel
first, not handed to you as architecture up front.

## The Environment, Honestly

- **No terminal, no `npm`, no `git`.** Every mechanism a real framework
  would import from a package — routing, validation, middleware,
  dependency injection — is built here, by hand, in plain JavaScript,
  specifically so the framework is never a black box.
- **No real network.** Clicking Send never leaves the browser tab — the
  Postman-style panel calls directly into a real, hand-written
  JavaScript interpreter running your code, in the same page.
- **Real persistence, for real.** Starting lesson 9, data survives
  across simulated requests and, after a successful local save, page
  reloads in the same browser. It uses an actual SQLite database (via [sql.js](https://sql.js.org/)), queryable
  directly through a real SQL console — not a simulation of a database,
  a real one.

## Lessons

| # | Title | What Breaks First | What You Build |
|---|---|---|---|
| 01 | Your First Endpoint | `handleRequest is not defined` | Functions, objects, arrays, and a real `{status, body}` response, from zero |
| 02 | A Router, Built By Hand | An `if`/`else` chain that can't scale | A dispatch table — first-class functions, indirection, the open/closed principle |
| 03 | Path Parameters | `/users/1` and `/users/2` need one route, not two | Hand-written pattern matching — `/users/:id` |
| 04 | Query Parameters | `?limit=1` has nowhere to live | A predicate-driven filter, read from `request.query` |
| 05 | POST Bodies and Validation | A malformed body crashes the whole request | `try`/`catch`, fail-fast validation, method-aware routing |
| 06 | Controllers | Six functions for two resources, all colliding on name | `usersController` — namespacing, cohesion, a stable interface over a rebuilt implementation |
| 07 | Middleware | Duplicated logging in every handler | A real middleware pipeline — Chain of Responsibility, cross-cutting concerns |
| 08 | Services | Business rules welded to HTTP | `usersService` — a pure, HTTP-independent business layer |
| 09 | Persistence | Every "created" user vanishes when the request ends | Real, durable storage — state, side effects, volatile vs. durable |
| 10 | The Query Problem | `db.getAllUsers()` only ever returns everyone | A hand-built query engine — predicates, `Object.keys`, generic filtering |
| 11 | Repositories | The service still knows exactly how storage works | `usersRepository` — the repository pattern, CRUD |
| 12 | Dependency Injection | Swapping storage means editing the service's source | `makeUsersService(repository)` — closures, inversion of control |
| 13 | Real SQL | String-concatenated SQL returns every row, not the right one | A real SQLite database, a SQL console, and SQL injection, demonstrated and fixed |
| 14 | Authentication | Any `Authorization` header at all gets through | Hashed passwords, verified logins, real session tokens |

## Definition of Done (whole project)

- A request can be routed, validated, handled, persisted, queried, and
  authenticated, using nothing but code written inside this project
- Every layer (router, controller, service, repository) can be
  explained in one sentence, and none of those sentences overlap
- A password is never stored, logged, or returned as plain text, anywhere
- You can reproduce the SQL injection example from lesson 13 and explain
  exactly why it works and exactly how the fix prevents it
- You can point to the exact one-line change lesson 13 required to swap
  real SQL in underneath a repository that lesson 9 already built
