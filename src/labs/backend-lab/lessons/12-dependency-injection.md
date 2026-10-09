# Backend Lab — Lesson 12 — Dependency Injection

## What You Will Build

`makeUsersService(repository)` — a factory that hands `usersService` its
repository from the outside, instead of `usersService` reaching out and
grabbing a fixed one by name, finally making lesson 11's "swap in a fake
repository for testing" promise real, not just theoretical.

---

## What You Need to Know First

Lesson 11's `usersRepository`/`usersService` split. Lesson 1's
inversion of control (this lab calling your `handleRequest`, not the
other way around) — this lesson applies the same reversal one level
deeper.

---

## Step 1 — Feel the Rigidity

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

`usersService` reaches out and grabs `usersRepository` **by name** —
that exact global variable, and no other. Lesson 11 claimed a fake,
test-only repository could stand in for it — but doing that today would
mean either editing `usersService`'s own source to name a different
variable, or overwriting the real global `usersRepository` before
running a test and hoping nothing else in the file still needs the real
one.

**SE lens — naming the rigidity precisely.** `usersService` **hardcodes**
which repository it uses — the specific name `usersRepository` is baked
directly into its own code. Nothing about *what* `usersService` does
(validate a name, ask for matching users) actually requires one specific
repository object; it only requires *something* shaped like a
repository. Right now, though, the code makes no distinction between
"the general shape I need" and "the one specific object I happen to be
using" — they're the same line.

---

## Step 2 — Receive the Repository, Instead of Reaching for It

```javascript
function makeUsersService(repository) {
  return {
    search: function (filters) {
      return repository.findAll(filters);
    },
    create: function (name) {
      if (!name) {
        return { success: false, error: "name is required" };
      }
      var user = repository.insert(name);
      return { success: true, user: user };
    },
  };
}

var usersService = makeUsersService(usersRepository);
```

Send the exact same requests lesson 11 verified — identical results.
`usersService` behaves exactly as before; only *how it was built*
changed.

**Walkthrough — `makeUsersService`, a factory function.** A function
whose entire job is constructing and returning some other value —
usually an object — is called a **factory function**. `makeUsersService`
takes one argument, `repository`, and returns a fresh object with
`search`/`create` methods, the same shape `usersService` has always had.
Calling `makeUsersService(usersRepository)` once, at the top of the
file, produces the exact same `usersService` this project has used since
lesson 8 — nothing observable changed yet.

**PL lens — closures, explained from zero, since this is the first
place this project genuinely needs them.** Look closely at `search` and
`create`, *inside* the returned object: neither one receives `repository`
as its own parameter — `search` only takes `filters`, `create` only
takes `name`. Yet both use `repository` freely, correctly, every time
they're called — even though `makeUsersService` already finished running
and returned, long before `search` or `create` are ever actually
invoked. This works because a function, once created, keeps a live
connection to every variable that was in scope at the moment it was
*defined* — not just the moment it's *called*. This connection is called
a **closure**: `search` and `create` each *close over* `repository`,
remembering the exact value passed into `makeUsersService` for as long
as either of them still exists, no matter how much later they're called
or how many times `makeUsersService` gets called again with a different
repository.

**CS lens — dependency injection, named precisely, and how it relates to
lesson 1's inversion of control.** `usersService` no longer decides
which repository it uses — whoever *calls* `makeUsersService` decides,
by choosing what to pass in. Supplying a component's dependencies from
outside, rather than letting it construct or look up its own, is called
**dependency injection** (often shortened to **DI**). This is the exact
same reversal lesson 1 named for this lab's hidden bridge calling your
`handleRequest` — inversion of control — applied here to a dependency
instead of an entire program's execution: `usersService` used to reach
out for what it needed (like a normal function call); now it's handed
what it needs, and never reaches out at all.

---

## Step 3 — See the Actual Payoff: a Fake Repository, for Real

```javascript
var fakeUsers = [{ id: 1, name: "Test User" }];
var fakeRepository = {
  findAll: function (filters) {
    return fakeUsers;
  },
  insert: function (name) {
    var user = { id: 99, name: name };
    fakeUsers.push(user);
    return user;
  },
};

var testService = makeUsersService(fakeRepository);
console.log(testService.search({}));
```

**Walkthrough — two completely independent services, from one factory.**
`testService` and the real `usersService` both came from the exact same
`makeUsersService` function, but each one closes over a *different*
`repository` — `usersService` over the real `usersRepository` (backed by
`db`), `testService` over `fakeRepository` (backed by a plain local
array, no `db` involved at all). Calling `testService.search({})` never
touches real storage — exactly the isolated, no-real-database test
lesson 11 promised was possible, now genuinely built, not just
described.

**SE lens — loose coupling, the property that made this possible.**
`usersService`'s code never mentions `db`, never mentions a specific
repository's name — it only ever calls `.findAll(...)` and `.insert(...)`
on whatever it was handed. This is **loose coupling**: depending only on
a shape (lesson 1's structural contract, one more time), never on a
specific object. Tight coupling — hardcoding `usersRepository` by name,
as in Step 1 — is exactly what made swapping impossible without editing
source code; loose coupling is what makes swapping just a different
function argument.

**Connect to the real world — this project's DI is manual, real
frameworks build a container to automate it.** Passing a dependency in
as a plain function argument, the way `makeUsersService` does, is
sometimes called **manual** or **"poor man's" dependency injection** —
genuinely real, genuinely used, and exactly what's needed here. Larger
frameworks (Spring's `@Autowired`, Angular's constructor injection,
NestJS's DI container, .NET's built-in container) automate the *wiring*
— deciding which real implementation to hand to which consumer, often
by inspecting types — but underneath all of that automation, the actual
mechanism being wired up is this same one: a dependency, supplied from
outside, not constructed or looked up from within.

---

## Connect the Pieces

```
makeUsersService(repository)  -->  returns { search, create }, each
                                    closing over whichever repository
                                    was passed in

makeUsersService(usersRepository)  -->  the real service, backed by db
makeUsersService(fakeRepository)   -->  a test service, backed by nothing real
```

---

## What Breaks Without This

**`search`/`create` reading the global `usersRepository` directly,
instead of the `repository` parameter, even after switching to
`makeUsersService`**: every service built by the factory would silently
share the *one* real repository regardless of what was actually passed
in — `testService` would quietly touch real `db` data anyway, defeating
the entire point, with no error anywhere to reveal the mistake.

**Calling `makeUsersService()` with no argument at all**: `repository`
would be `undefined` inside the returned methods — `repository.findAll(...)`
would throw immediately the first time `search` is actually called,
*not* at the moment `makeUsersService()` itself was called — a real,
common category of bug worth naming: a missing dependency often isn't
noticed until the exact method that needed it finally runs.

---

## Definition of Done

- [ ] `usersService`, built via `makeUsersService(usersRepository)`, behaves identically to lesson 11
- [ ] A second service, built via `makeUsersService(fakeRepository)`, reads and writes only the fake array, never real `db` data
- [ ] You can explain what a closure is, using `search`'s access to `repository` as the example
- [ ] You can explain dependency injection and how it relates to lesson 1's inversion of control
- [ ] You can explain the difference between tight coupling (Step 1) and loose coupling (Step 2), using `usersService`'s two versions as the example
- [ ] You can explain why a missing dependency (`makeUsersService()` with no argument) fails when a method is called, not when the factory is called

---

*Next: `usersRepository` still uses the small convenience API exposed by
`db`. Lesson 13 replaces those calls with SQL you write against the same
SQLite database, using the SQL console to inspect it directly —
while `usersService`, thanks to this lesson's loose coupling, won't need
to change at all.*
