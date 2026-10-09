# Backend Lab — Lesson 9 — Persistence

## What You Will Build

Real, durable storage — `db`, a new global this lab provides — so a user
created by one request is still there the next time anyone asks,
finally resolving the honest limitation lesson 1 named on day one.

---

## What You Need to Know First

Lesson 1's honest limitation: this lab's entire file re-runs, completely
fresh, on every simulated request — and the word it used for that,
**stateless**. Lesson 8's `usersService`/`usersController` split.

---

## Step 1 — Feel the Loss, Concretely

Send `POST /users` with `{ "name": "Priya" }` — a real `201`. Now send
`GET /users` — Priya is nowhere in the response. The "created" user
vanished the instant the request that created it ended.

**SE lens — this is lesson 1's limitation, finally felt instead of just
read about.** Lesson 1 said, honestly, up front: "every request re-runs
your entire file from scratch... nothing is ever remembered from one
request to the next." At the time, nothing observable depended on it.
This is the first moment it does: `usersService.create` builds a `user`
object, returns it once, and then — because it lived only inside that
one run of the file — it's gone. There was never really a "database"
here at all; there was a hardcoded array, rebuilt identically, every
single time.

**CS lens — state, named directly, since this whole lesson is about
introducing it.** Information that persists and can be *remembered*
across separate moments in time is called **state**. Before this
lesson, this project had none: every request began from the exact same
starting point, because nothing survived long enough to be remembered.
Creating a user is this project's first genuine attempt to introduce
state — and right now, it fails, because nothing yet exists outside the
one request that tried.

---

## Step 2 — Meet `db`, a New Global This Lab Provides

```javascript
var users = db.getAllUsers();
var newUser = db.insertUser("Test");
```

**PL lens — convention, not language, restated from lesson 1, for the
biggest example yet.** `db` is not a JavaScript feature — no more than
`handleRequest` or `request.path` ever were. It's a global this lab adds
specifically for this lesson, the same way `console` and `JSON` are
globals the *language* provides. `db.getAllUsers()` and `db.insertUser(name)`
are this lab's own small, invented API — worth naming honestly, exactly
as lesson 1 insisted on doing for `handleRequest` itself.

**CS lens — real state, living outside the file that keeps re-running.**
`db.getAllUsers()` and `db.insertUser(...)` reach into memory that exists
*outside* your file entirely — memory that was already there before your
file started running this time, and will still be there the next time it
runs. This is the actual, concrete mechanism that finally gives this
project real state: not by changing how your file runs (it still reruns
completely fresh, every time), but by giving it a way to reach something
that *doesn't* rerun. `db` is durable in exactly the sense lesson 1
implied a real server's memory would be — remembered between requests —
while your file's own variables (`var users = ...`) still reset every
time, exactly as before.

**Honest correction — this doesn't make HTTP itself stateful.** It's
worth being precise here, since "HTTP is stateless" is a true, permanent
fact you'll hear stated flatly elsewhere, even from backends with a real
database behind them. Each request is still, and always will be,
completely self-contained — nothing about *the request itself* carries
memory of a previous one, and nothing here changes that. What actually
changed is that this project now has **application state**: durable data
`db` holds, that requests can read and write, entirely separate from
whether HTTP itself remembers anything. A request stays independent; the
*storage it can reach* is what's new.

**CS lens — a side effect, named precisely, since `usersService.create`
just gained its first one.** Lesson 8 emphasized that `usersService.create`
was pure — call it, get a value back, nothing else happens anywhere.
That's no longer true, on purpose: calling it now also *changes something
outside itself* — a new row appears in `db`, permanently, independent of
whatever gets returned. Any effect a function has beyond computing its
own return value — writing to storage, changing a shared variable,
printing to a log — is called a **side effect**. This is the moment this
project's code stops being pure computation and starts being a real
program that changes the world around it, which is what a backend
building anything real eventually has to do.

**Persistence in this browser.** The lab runs a real SQLite database in
memory and saves its contents to **IndexedDB**, the browser's local database
storage, after requests and SQL commands. No account is required. A successful
save survives a page reload in the same browser profile and on the same site.
If saving fails, the lab shows a warning; the current session still holds the
changes. An unfinished SQL transaction must be committed or rolled back before
it can be saved.

This is local storage, not a remote server or an automatic backup. Clearing
site data, browser eviction, or ending a private-browsing session can remove it.
Use **Export backup** to download your code, requests, progress and database;
**Import backup** restores them in another browser. Use practice credentials
in authentication exercises, since those tables are included in the backup.

**CS lens — object lifetime.** A variable inside `handleRequest` exists for
that execution; all project variables are recreated on the next simulated
request. The live SQLite database spans requests. Its saved IndexedDB copy
spans page reloads. Memory is **volatile**: closing the page loses it. Saving
creates a longer-lived copy, but that copy still needs a backup. These are
different lifetimes, not one single promise that "it persists forever."

**Try it.** Create a user, then reload the page and request the user list.
Predict which survives: the database row or a variable in your handler.
Inspect the SQL tab to check your explanation. Lesson 13 will teach you to
write SQL against this same database directly; today, `db` hides that detail.

**CS lens — read operations versus write operations, a distinction this
lesson makes concrete for the first time.** `db.getAllUsers()` **reads**
state — it looks, but changes nothing. `db.insertUser(name)` **writes**
state — it permanently changes what future reads will see. This maps
directly onto something already met: lesson 4 named `GET` **idempotent**
specifically because reading never changes anything, no matter how many
times it's repeated. `POST`, calling `db.insertUser`, is a write — and
writes are exactly the operations idempotence doesn't apply to, which is
precisely why lesson 4's distinction mattered before persistence ever
existed to make it concrete.

---

## Step 3 — Wire the Service to Real Storage

```javascript
var usersService = {
  getAll: function () {
    return db.getAllUsers();
  },
  create: function (name) {
    if (!name) {
      return { success: false, error: "name is required" };
    }
    var user = db.insertUser(name);
    return { success: true, user: user };
  },
};

var usersController = {
  getAll: function (request) {
    return { status: 200, body: usersService.getAll() };
  },
  create: function (request) {
    var data;
    try {
      data = JSON.parse(request.body);
    } catch (err) {
      return { status: 400, body: { error: "Body must be valid JSON" } };
    }
    var result = usersService.create(data.name);
    if (!result.success) {
      return { status: 400, body: { error: result.error } };
    }
    return { status: 201, body: result.user };
  },
};
```

Send `GET /users` — empty. Send `POST /users` with `{ "name": "Priya" }`
— a real `201`, with a real `id: 1`. Send `POST /users` again with
`{ "name": "Sam" }` — `id: 2`. Send `GET /users` — **both** users come
back, in a single list, even though three completely separate simulated
requests produced them.

**Walkthrough — `db.insertUser` deciding the id, not your code.** Notice
`usersService.create` no longer invents an id itself (lesson 8's
hardcoded `id: 4` is gone) — `db.insertUser(name)` returns the real,
freshly-assigned user, id included. Assigning a unique, ever-increasing
number to each new row is called **auto-incrementing** — a genuinely
common, real mechanism (SQL's `AUTO_INCREMENT`/`SERIAL` do exactly this)
this lab's `db` reproduces honestly in miniature.

**SE lens — a single source of truth, finally, and why more than one
copy is genuinely dangerous.** Before this lesson, "the users" were
represented however many places happened to hardcode a users array —
`getAllUsers`'s own literal, separate from whatever `createUser`
invented. The moment two or more copies of the same data exist, they can
**disagree**: one gets updated, the other doesn't, and now which one is
actually "correct" is a real, unanswerable question. Now there is
exactly one real place user data lives: `db`. Both reading (`getAll`)
and writing (`create`) go through it, which means disagreement between
copies isn't a bug this project has to defend against — it's structurally
impossible, because there's only ever one copy to begin with.

**CS lens — identity, and why an id is doing a different job than a
name.** Two different users can both be named "Mike" — a name doesn't
uniquely pick out *one* person. An **id** exists specifically to solve
this: a value guaranteed unique per row, used whenever code needs to
mean "this exact one," not "someone matching this description." This is
precisely why `db.insertUser` generates an id itself, rather than
trusting the caller to invent one — identity has to be guaranteed by the
one place new rows are actually created, or the guarantee doesn't
actually hold.

**CS lens — shared mutable state, named now, worth watching for later.**
`db` is not just remembered — it's **shared** (every request reaches the
exact same storage) and **mutable** (writes actually change it). This
combination — data more than one thing can both read and change — is
called **shared mutable state**, and it's one of the most consequential
ideas in all of software engineering: it's the root cause behind race
conditions, the reason database transactions exist, and the reason
concurrent systems are hard to get right. None of those problems are in
scope for this lesson (nothing here runs two requests genuinely at
once), but the *shape* that eventually causes them is exactly what just
got introduced.

**SE lens — persistence adds time to this project, not just storage.**
Every lesson before this one could be understood by looking at one
request in isolation — nothing about `handleRequest`'s behavior depended
on *when* it ran, or what happened before it. That's no longer true:
`GET /users` now returns a different answer depending on what earlier
requests already did. Requests are no longer independent snapshots — the
project now has a real, observable history, and understanding "what will
this request return" requires knowing what came before it, not just
reading the code in isolation.

**CS lens — `db` is already hiding *how* storage works, an abstraction
worth noticing before lesson 11 names it.** `usersService` calls
`db.getAllUsers()` and `db.insertUser(name)` without knowing, or caring,
whether `db` is backed by an array in a test,
a `Map`, or — starting in lesson 13 — a real SQL database. Hiding the
real implementation of storage behind a small, stable set of operations
is a real, valuable abstraction, already at work here even before it
gets a formal name.

**SE lens — the payoff lesson 8 could only promise, now real.**
Lesson 8 separated `usersService` from `usersController` before there
was any real reason `usersController` *couldn't* have talked to storage
directly — the split was preparing for this moment. Now the reason is
concrete: `usersController` still knows nothing about `db` at all, and
never will. If `db` were replaced by a real SQL database in lesson 13
(it will be), `usersController` would not need a single line changed —
only `usersService`'s insides would. This is lesson 6's "stable
interface, changing implementation" idea, at its most concrete yet.

**SE lens — a discipline, not (yet) an enforced rule: only the service
touches `db`.** Nothing in this language actually *stops* `usersController`,
or any future handler, from calling `db.insertUser(...)` directly,
skipping `usersService.create`'s validation entirely. Right now, that
boundary is a convention this project intends to honor, not a wall the
language enforces — worth naming honestly, since "the rule exists but
nothing enforces it" is a real, common state of affairs in growing
codebases, not a flaw unique to this one.

**Connect to the real world.** `db.getAllUsers()`/`db.insertUser(name)`
is a small, honest stand-in for what a real database driver or ORM
provides in a real backend — libraries like `pg` (PostgreSQL), Mongoose
(MongoDB), or Prisma all expose exactly this shape: JavaScript-callable
functions that reach into storage living outside your running program
entirely. This lesson's `db` is simpler on purpose, but the role it
plays in the architecture is identical.

---

## Connect the Pieces

```
Request 1 (POST)  -->  usersController  -->  usersService  -->  db.insertUser
                                                                      |
                                                            [ file re-runs fresh; db does not ]
                                                                      |
Request 2 (GET)   -->  usersController  -->  usersService  -->  db.getAllUsers
                                                                 (sees Request 1's insert)
```

---

## What Breaks Without This

**Calling `db.insertUser` directly from a controller, bypassing the
service**: nothing crashes — a user gets created either way — but the
service's validation (`if (!name)`) never runs, meaning an empty or
missing name could be written into `db` with no error anywhere. The bug
wouldn't announce itself; it would just mean bad data quietly exists.

**Forgetting `db` is shared across every request, including ones sent
while testing something unrelated**: `db.getAllUsers()` returns
*everyone* ever inserted this session, not just users relevant to
whatever you're currently testing — sending several test `POST`s while
experimenting means `GET /users` keeps growing, which is correct
behavior, not a bug, but easy to find surprising the first time.

---

## Definition of Done

- [ ] `POST /users` followed by `GET /users` shows the created user, in the same response list
- [ ] Two separate `POST /users` calls produce two different, auto-incrementing ids
- [ ] You can explain why `db` is a convention this lab provides, not a JavaScript language feature
- [ ] You can explain what survives requests and reloads, and why browser storage still needs a backup
- [ ] You can explain the difference between volatile and durable storage
- [ ] You can explain why `usersController` never needed to change in this lesson, even though storage completely did
- [ ] You can explain what would happen, and what wouldn't be caught, if a handler called `db.insertUser` directly instead of going through `usersService`
- [ ] You can explain what state means and why this project had none before this lesson
- [ ] You can explain why HTTP itself is still stateless, even though this project now has application state
- [ ] You can explain what a side effect is, using `usersService.create` before and after this lesson as the example
- [ ] You can explain why an id serves a different purpose than a name
- [ ] You can explain what shared mutable state means, using `db` as the example
- [ ] You can explain the difference between reading state and writing state, and how it connects to lesson 4's idempotence

---

*Next: `db.getAllUsers()` always returns everyone — there's no way yet to
ask for just one user, or search, or filter. The query problem is next:
building a real, hand-written way to ask storage a specific question,
instead of always reading everything.*
