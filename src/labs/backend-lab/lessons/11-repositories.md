# Backend Lab — Lesson 11 — Repositories

## What You Will Build

`usersRepository` — an object whose entire job is knowing how to fetch
and store user data, hiding `db` and the query-matching engine behind a
small, stable set of methods, so `usersService` never has to know
*how* storage actually works, only *that* it can ask for data and get it.

---

## What You Need to Know First

Lesson 9's `db.getAllUsers()`/`db.insertUser(name)`. Lesson 10's
`findUsers`/`matchesFilters`. Lesson 8's controller/service split — this
lesson performs the same kind of split one layer deeper.

---

## Step 1 — Feel the Tangling, One Layer Deeper

```javascript
var usersService = {
  search: function (filters) {
    return findUsers(db.getAllUsers(), filters);
  },
  create: function (name) {
    if (!name) {
      return { success: false, error: "name is required" };
    }
    var user = db.insertUser(name);
    return { success: true, user: user };
  },
};
```

`usersService` now does two genuinely different jobs: deciding business
rules (is this name valid?) and knowing exactly how to fetch and store
data (`db.getAllUsers()`, `findUsers(...)`, `db.insertUser(...)`). This
is the identical shape lesson 8 solved between HTTP and business logic —
showing up again, one layer further down, between business logic and
data access.

**SE lens — the felt limit: business rules can't change independently
of storage details.** Imagine `db` is replaced by a real SQL database
(lesson 13, and it will be) — every method in `usersService` that
touches `db` or calls `findUsers` would need to change, even though "a
user needs a name" hasn't changed even slightly. The business rule and
the storage mechanism are currently forced to change together, for
reasons that have nothing to do with each other.

**CS lens — coupling, named precisely, not just described.** Two pieces
of code are **coupled** when a change to one is likely to force a
change to the other. Right now `usersService` is tightly coupled to
`db`'s exact shape — `usersService` "knows" `db`, the same way a
function that reads a global variable "knows" about that variable.
**High coupling** between a business rule and a storage detail is
exactly what makes "swap the storage" turn into "rewrite the business
logic" — the actual, concrete cost this lesson exists to remove.

**SE lens — why SQL specifically should never live inside a service.**
Imagine `usersService.create` contained raw SQL directly: it would now
know three unrelated things at once — the business rule (a name is
required), the table's exact name, and the SQL dialect a specific
database happens to use. A later switch from one database engine to
another (SQLite to Postgres, say, or to a document store) would force a
rewrite of business logic that never actually changed — the exact
failure mode a repository exists to prevent, stated concretely rather
than left implicit.

---

## Step 2 — Extract a Repository

```javascript
var usersRepository = {
  findAll: function (filters) {
    return findUsers(db.getAllUsers(), filters);
  },
  insert: function (name) {
    return db.insertUser(name);
  },
};
```

**CS lens — the repository pattern, named precisely.** A **repository**
is an object whose only job is translating between "get me data matching
these criteria" / "store this new thing" and whatever the actual storage
mechanism happens to be underneath. `usersRepository` doesn't know or
care whether storage uses an array in a test, a `Map`, or real SQL; it just exposes a small, storage-agnostic vocabulary
(`findAll`, `insert`, and later `findById`, `update`, `delete`) that
never needs to change no matter what's actually behind it.

**CS lens — CRUD, the standard vocabulary this vocabulary is drawn
from.** **Create, Read, Update, Delete** — CRUD — names the four basic
operations almost every resource in almost every backend needs.
`usersRepository.insert` is Create; `findAll` is Read. Later lessons will
add Update and Delete to this exact repository, using this exact same
naming convention — a real, industry-standard vocabulary, not this
project's own invention.

**CS lens — abstraction, the actual mechanism the repository pattern is
built from.** `usersRepository.findAll`/`.insert` are an **abstraction**:
a simplified, general-purpose surface standing in front of a real,
specific, more complicated thing underneath. The caller only ever
thinks in terms of "give me users" / "store this user" — never in terms
of arrays, SQL tables, files, or a network call to some other service,
even though one of those is always the real answer underneath. This is
the same abstraction idea lesson 2 named for the router (a lookup
instead of a chain of specific checks) and lesson 6 named again for
controllers (a resource instead of six individual functions) —
reappearing here at the storage boundary.

**CS lens — an interface, restated from lesson 1, now describing an
object's shape instead of a function's.** Lesson 1 named an interface as
an agreed shape both sides commit to. `usersRepository`'s interface is
exactly two names — `findAll(filters)`, `insert(name)` — nothing about
what argument types mean beyond that, nothing about how either method
is implemented. Anything satisfying that same two-method shape can be
used wherever a repository is expected. JavaScript never checks this for
you the way some languages formally check an `interface` keyword — the
contract here is a real, load-bearing agreement, just not one the
language itself enforces.

---

## Step 3 — The Service Talks Only to the Repository

```javascript
var usersService = {
  search: function (filters) {
    return usersRepository.findAll(filters);
  },
  create: function (name) {
    if (!name) {
      return { success: false, error: "name is required" };
    }
    var user = usersRepository.insert(name);
    return { success: true, user: user };
  },
};
```

Send the exact same requests lesson 10 verified — `POST /users`,
`GET /users?name=Priya` — identical results. Nothing observable changed;
`usersService` no longer mentions `db` or `findUsers` anywhere at all.

**Walkthrough — what actually moved, and what didn't.** `usersService.create`
still decides *whether* a name is valid — that never left. It no longer
decides *how* a user actually gets stored — that's `usersRepository.insert`'s
job now, exclusively. The business rule and the storage mechanism can now
change completely independently: swapping `db` for real SQL only touches
`usersRepository`; adding a new validation rule only touches `usersService`.

**CS lens — cohesion, coupling's opposite-facing companion.** Coupling
(Step 1) asks how much two *different* things depend on each other.
**Cohesion** asks the opposite-facing question: how focused is *one*
thing's job? Before this lesson, `usersService` mixed validation and
storage logic — low cohesion, two unrelated jobs in one object. After
this lesson, `usersService` only validates, and `usersRepository` only
stores — each one is now highly cohesive. The actual engineering goal
this whole lesson series keeps aiming at is both at once: **high
cohesion, low coupling** — each piece focused and self-contained,
depending on its neighbors as little as possible.

**SE lens — the real payoff: a fake repository, swapped in for testing,
with zero changes to `usersService`.** Because `usersService` only ever
calls `usersRepository.findAll`/`.insert` — never `db` directly — a test
could hand it a *completely fake* repository instead: a plain object
with the same two method names, backed by nothing but a local array (a
tiny **in-memory** store, built just for the test, sometimes called a
**test double** or a **fixture**), with no `db` bridge involved at all.
`usersService`'s validation logic could be tested in complete isolation
this way, without touching real storage — this only works because
`usersService` depends on a *shape* (two method names), not on `db`
specifically.

**CS lens — polymorphism, the real name for "swap the object, keep the
shape."** The real `usersRepository` and a fake, array-backed one are
two completely different objects, built two completely different ways —
yet anywhere a repository is expected, either one works identically,
because both satisfy the same two-method shape. Treating genuinely
different objects identically, because they share a common shape
(interface), is called **polymorphism** — not the class-inheritance kind
some languages require, but the more general version JavaScript's
structural typing gives you for free, already named informally back in
lesson 1 as a "structural contract."

**SE lens — dependency direction, and the principle it's a real
instance of.** `usersService` depends on the *repository shape*, not on
`db` and not on any one specific repository object — the dependency
points at an abstraction, not at a concrete detail. This is a real,
named idea in software design, the **Dependency Inversion Principle**:
higher-level policy (the business rule "a name is required") shouldn't
depend directly on low-level detail (which specific database is being
used) — both should depend on a shared abstraction in between. This
project isn't building the full, formal version of that principle yet —
the next lesson, dependency injection, is what actually lets you swap
which real object gets used, as long as it has the right shape — but
the shape of the idea is already sitting here, one lesson early.

**Connect to the real world.** The repository pattern is a real, named,
extremely common architecture: Spring Data's `Repository` interfaces,
Laravel's repository classes, and Entity Framework's `DbSet`s all exist
specifically to hide a real database behind a small, storage-agnostic
API — precisely the role `usersRepository` plays here, at a much smaller
scale.

---

## Connect the Pieces

```
Request
   |
Controller   (HTTP: status codes, parsing)
   |
Service      (business rules: is this valid?)
   |
Repository   (storage-agnostic: findAll, insert)
   |
db           (today: an array. Lesson 13: real SQL.)
```

**CS lens — a named stack, not just this project's own invention.**
Controller → Service → Repository is a specific case of a much more
general, widely-used layering: a **presentation layer** (HTTP in, HTTP
out), a **business layer** (rules), and a **data access layer** (storage).
Real, larger backend systems often add more layers still — a distinct
"entity" or "model" layer describing what a row of data actually looks
like, for instance — but this three-layer shape, controller/service/
repository, is already the same real stack under a different name.

**SE lens — an honest caveat: this is not automatically the right
choice for every project.** A repository is a genuine, valuable pattern
— and also genuinely unnecessary overhead for a project small enough
that storage will never change and never needs faking for a test. This
project builds one because it's about to swap storage for real (lesson
13) and because testability was worth demonstrating concretely — real
reasons, not assumed ones. A five-route project that will only ever use
one database, forever, might reasonably skip this layer entirely and
let its service talk to storage directly. Adding structure has a real
cost (more files, more indirection to trace through); it's worth
adopting for a reason, not by default, on every project, regardless of
size.

---

## What Breaks Without This

**`usersService` calling `db` directly anywhere, even once, alongside
using `usersRepository` elsewhere**: the moment even one method bypasses
the repository, the "storage details never leak above this layer"
guarantee is already broken for that one path — swapping storage later
would require re-auditing every service method individually to check
which ones still secretly depend on `db`, rather than trusting the
boundary completely.

**Adding a new repository method that returns something
`db`-shaped instead of plain data** (for example, returning a raw
heap-wrapped object instead of the same plain shape `findAll`/`insert`
already return): callers of the repository would need to know
storage-specific details to use it correctly, quietly reintroducing the
exact coupling this lesson just removed.

---

## Definition of Done

- [ ] `POST /users` and `GET /users?name=...` behave identically to lesson 10
- [ ] `usersService` no longer references `db` or `findUsers` anywhere
- [ ] You can explain what a repository is and what specific concern it isolates
- [ ] You can explain what CRUD stands for and name which repository method corresponds to each letter so far
- [ ] You can explain why a fake, array-backed repository could replace `usersRepository` in a test without changing `usersService` at all
- [ ] You can explain the difference between coupling and cohesion, using this lesson's before-and-after as the concrete case
- [ ] You can explain what an abstraction is, using `usersRepository`'s two methods as the example
- [ ] You can explain why the real and fake repositories are an example of polymorphism
- [ ] You can explain, in your own words, what the Dependency Inversion Principle means
- [ ] You can explain when a repository layer is genuinely worth adding, and when it's unnecessary overhead

---

*Next: swapping in that fake repository for a test still means editing
`usersService`'s own code to point at a different repository object.
Dependency injection is next: a real mechanism for handing a service
its repository from outside, instead of the service reaching out and
grabbing one by name.*
