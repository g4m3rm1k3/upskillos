# Backend Lab — Lesson 1 — Your First Endpoint

## What You Will Build

A single working endpoint. Click **Send** on the waiting `GET /users` request
to run the starter in `server.js`: a real 200 response with a user named Ada.
Then deliberately break the handler, understand the error, and rebuild it
yourself. The starter is editable code, not a response supplied by the simulator.

---

## What You Need to Know First

Nothing backend-specific. This lesson assumes you can write a variable and
a loop — nothing more. Functions, objects, and everything else backend
work depends on are explained here, from zero, the first time each one is
needed.

---

## The Environment, Named Honestly

Three things a real backend has that this lab deliberately doesn't, so
none of them are ever silently assumed later:

**No terminal, no `npm`, no `git`.** Everything you write lives in the
editor pane and runs the instant you click Send — there's no command
line to type into, no packages to install, and no version history to
commit. This project builds and explains one thing at a time entirely
through the code itself; when a real backend tutorial would say "run
`npm install express`," this series instead builds the small piece of
what a router or a framework actually does, by hand, in plain JavaScript.

**No real network, no real port.** A real server listens on an actual
port number (`3000`, `8080`, and so on) and receives requests that
traveled across an actual network, even if that network is just your own
machine talking to itself. Here, clicking Send never leaves your browser
tab at all — the Postman panel calls directly into the interpreter
running your code, in the same page, with no network involved anywhere.
The request/response *shape* is real and faithfully modeled; the wire
they'd travel across in a real deployment simply isn't part of what this
lab simulates.

**No `window`, no `document`, no DOM.** The code you write in this lab
never has access to browser-only features — and that's not a limitation
put in place for teaching purposes, it's an honest, accurate feature of
backend code in general: a real Node.js server has no browser tab
attached to it either, and so has no DOM to touch, exactly like this
lab. If you've written frontend code before, this is the biggest
mental shift: nothing here can select an element or listen for a click.

---

## Step 1 — Run It, Then Investigate a Failure

The **Postman panel** on the right already has a request waiting:
`GET /users`. Click **Send**.

On a new project, you'll see **200** and `[{ "id": 1, "name": "Ada" }]`.
Open **Code** to see the `handleRequest` function that produced it. Change Ada
to your own name and send again: the response should reflect your edit.
Try `/missing` and observe the starter's **404**, then restore `/users`.

Now deliberately rename the function from `handleRequest` to `myHandler`
and click **Send**. You'll see `ReferenceError: handleRequest is not defined`.
Rename it back and send again to recover. Keep this deliberate experiment in
mind through the explanations below. Existing projects retain their saved code;
if yours is empty, a minimal working handler appears in Step 3.

**CS lens — the client-server model, named precisely, since this is the
first backend concept on this entire platform.** Every program you've
likely written before this ran on one machine, start to finish, for one
person, at one time — you ran it, it did something, it finished. A
**backend** is a fundamentally different shape of program: it starts once
and then *waits*, indefinitely, for **requests** to arrive from somewhere
else — a browser, a phone app, another program entirely — and answers
each one with a **response**, then goes back to waiting. The thing sending
requests is called a **client**; the thing waiting and responding is the
**server**. This lab's Postman panel plays the role of a client by hand —
every "Send" click is you, personally, doing what a real browser or app
would do automatically, so that the client/server relationship is
something you directly operate, not something abstract.

**CS lens — event-driven programming, the shape underneath "waits, then
answers."** A backend doesn't run top-to-bottom once and stop — it sits
idle until something happens, reacts to that one thing, then goes back to
idle. A request arriving is an **event**; `handleRequest` running in
response to it is an **event handler** — its name is not a coincidence.
Programs built around "wait for something to happen, then react" instead
of "run a fixed sequence of steps" are called **event-driven**. Every
click, every keypress, every incoming network request in real software is
this same shape.

**Walkthrough — what a request and a response actually are, concretely.**
A request is not a vague idea — it's a real, structured piece of
information with specific parts: a **method** (what kind of action is
being asked for — `GET` means "give me something," you'll meet others
later), and a **path** (which specific thing is being asked for — `/users`
here). A response is equally concrete: a **status** (a number stating
what happened) and usually a **body** (the actual data, if any). This
lab's Postman panel builds a real request object from what you typed into
it and hands that object to the handler in your editor. The starter works
because it defines that handler. Renaming it breaks the agreement, producing
a real interpreter error rather than a staged failure.

**CS lens — message passing: the client and server never share memory,
only messages.** Nothing about the client "reaches into" the server, and
nothing about the server "reaches into" the client — the *only* thing
that crosses between them is the request going one way and the response
coming back. Communication built entirely out of self-contained messages,
with no shared state between the two sides, is called **message
passing**. This is not a small detail — it's the same foundational idea
behind distributed systems, microservices, and the actor model in
concurrent programming: independent pieces that only ever talk to each
other by sending complete messages, never by peeking at each other's
internal variables.

**Walkthrough — why the error says `handleRequest` specifically, and the
one honest thing happening behind the scenes.** This lab has one fixed
rule, stated plainly instead of left for you to guess: whatever you write
in the editor is expected to define a function named exactly
`handleRequest`. Every time you click Send, this lab takes the request
you built in the panel and runs one line of code you never see and never
write yourself: something equivalent to `handleRequest(theRequestYouBuilt)`,
handing whatever that call returns back to the Response tab. This is the
entire mechanism, named honestly rather than left mysterious — one small,
fixed bridge connecting the Postman panel's "Send" button to whatever
function in the editor. When you rename it to `myHandler`, `handleRequest`
no longer exists in your project, so that one hidden line fails immediately,
the same way calling any name that was never defined fails in any
JavaScript program, in any environment, for any reason — this lab isn't
doing anything special or hiding a softer failure from you.

**CS lens — an interface: a promise made in both directions, before any
code exists to keep it.** "Define a function named exactly `handleRequest`,
taking one request and returning one response" is not a suggestion — it's
an **interface**: a fixed agreement about a shape, made before either
side is finished being built. This lab promises "if you define
`handleRequest` correctly, I will call it, every time." Your code promises
"if you call me with a request, I will return a response." Neither side
needs to know how the other is actually implemented — only that the
agreed shape is honored. This exact idea reappears constantly in real
software, under different names: a Java `interface`, an abstract base
class, a callback function passed into a library, a framework lifecycle
method, a React component's props, and — later in this exact series —
middleware. Recognizing "something else is going to call my code,
according to a shape I need to match" is one of the most useful patterns
in this entire lesson series.

**SE lens — inversion of control: notice who is actually in charge
here.** In every program you've likely written before this, *you* wrote
the sequence: your code called function A, which called function B, and
you controlled the order top to bottom. Here, that's reversed: this lab's
hidden bridge line calls `handleRequest` — your code never calls itself,
and never decides when it runs. The **framework** (this lab) owns the
overall flow; your code only supplies *what happens* when it's your turn.
This reversal — where a framework or platform calls into code you wrote,
rather than your code calling out to the framework — is called
**inversion of control**, and it is one of the single biggest shifts
between "programs I write and run myself" and "code written for a
framework." Nearly every backend framework, and most frontend ones too
(React itself is built this way), work exactly like this lab does: you
provide behavior, something else decides when to invoke it.

**CS lens — an abstraction boundary: enormous complexity, hidden behind
one simple object.** A real server receiving `GET /users` has to manage
raw network sockets, parse TCP packets, and decode HTTP text byte by
byte, long before anything resembling `request.path` exists. None of
that happens anywhere you can see it in this lab — `request` simply
*arrives*, already a clean object with a `path` field ready to read.
Hiding a large, complicated subsystem behind a small, simple interface is
called an **abstraction boundary**; not needing to know what's hidden
behind it — and not being able to accidentally depend on how it works
internally — is called **information hiding**. Both are happening here:
you get `request.path`; you never have to think about sockets to use it.

**Debugging aside — where this error actually lives, and how to read any
error this lab ever shows you.** The error you just saw didn't appear in
a popup or a separate console you have to go find — it rendered directly
inside the **Response tab** of the Postman panel, in red, with two parts
stacked on top of each other: an **error type** on top (`ReferenceError`
— JavaScript's name for "you tried to use a name that was never defined
anywhere"), and the specific **message** underneath (`handleRequest is
not defined`). Every error this lab ever shows you, for the rest of this
series, appears in exactly this same place, in exactly this same shape —
type on top, message below — whether it's this `ReferenceError`, a
`TypeError` from calling something that isn't a function, or any other
kind. Once you know to look there, you'll never have to guess where an
error went.

**CS lens — error propagation, named at the exact moment you're watching
it happen.** Nothing in this lab caught or handled the missing-function
problem — the failure happened deep inside the hidden bridge call, and
because nothing stopped it, it kept surfacing outward, layer by layer,
until it reached the Response tab where you could see it. This is called
**error propagation**: an error, left unhandled, keeps traveling upward
through whatever called whatever failed, until either something catches
it or it reaches the very top and gets reported. Right now, nothing in
this project interrupts that propagation — a later lesson (`try`/`catch`,
once request bodies are involved) will show you how to catch an error on
purpose, partway through, instead of letting it propagate all the way out.

**SE lens — a test client, kept separate from the thing it's testing, on
purpose.** The Postman panel never looks at your code and never knows
how `handleRequest` is implemented — it only sends a request object in
and reads whatever comes back. This is a real, named testing pattern:
exercising a system entirely from the outside, through its public
interface, without any knowledge of its internals, is called
**black-box testing**. A QA engineer manually trying URLs in a browser,
and an automated integration test suite hitting a real running server,
are both doing exactly this — the Postman panel is a small, honest
version of the same idea, not a teaching fiction invented for this lab.

**SE lens — convention, not language. Two very different things, worth
telling apart from the very first lesson.** `handleRequest`, `status`,
and `body` are not JavaScript features — nothing about the JavaScript
language cares what you name a function, or what fields an object
happens to have. They're this project's **convention**: an agreed-upon
naming scheme this lab's code was written to expect. `function`,
`return`, and `if`, by contrast, *are* real JavaScript — the language
itself understands and enforces what those words mean, everywhere,
regardless of what project you're in. Confusing the two is one of the
most common sources of beginner confusion in any framework: "why doesn't
this work the same way in a different project?" is almost always the
answer "because that part was a convention, not the language."

**Honest limitation, worth knowing now rather than being surprised by
later.** A real server, once started, keeps running — it starts once and
answers thousands of requests afterward, all without restarting. This
lifecycle — **start once, then wait, receive a request, invoke a handler,
return a response, and go back to waiting** — repeats forever, and a real
server never forgets what happened between requests unless it's
specifically told to. This lab works differently, on purpose, to keep
things simple while you're still learning the basics: every single time
you click Send, your *entire* file runs again, completely fresh, from the
top, as if the lab had just started up for the first time — nothing is
ever remembered from one request to the next. Code that behaves this
way, with zero memory of anything that happened before it, is called
**stateless**: every run starts from the exact same blank slate. Right
now this changes nothing you can observe — `handleRequest` behaves
identically whether it's freshly loaded or not. It becomes a real, felt
design question later, once a lesson asks you to remember something
(like a saved item) *between* requests — worth knowing the honest
mechanism, and the word for it, now, before that moment arrives, rather
than being confused by it then.

---

## Step 2 — Functions, From Zero

A **function** is a named, reusable block of code you can *run* by
writing its name followed by parentheses. You've been assumed to know
variables and loops already — a function is the next building block: a
way to give a whole block of code a name, so it can be run again later
without rewriting it.

```javascript
function greet() {
  return "hello";
}
```

**Walkthrough.** `function greet() { ... }` **defines** `greet` — it does
**not** run the code inside it yet. The code inside only runs when
something later actually **calls** it: `greet()`. The parentheses are
what make it a call instead of just a mention of the name — `greet` on
its own just refers to the function itself; `greet()` actually runs it.

**CS lens — a function is the smallest unit of abstraction in this
language.** `greet()` hides whatever work happens inside it behind one
short name — anything calling `greet()` only needs to know *what* it
returns, never *how* it computes that. This is the exact same abstraction
idea Step 1 already named for the whole request/response system, just at
the smallest possible scale: a function is where abstraction starts.

**Walkthrough — `return`.** The `return` keyword hands a value back to
whatever called the function, and immediately stops running anything else
inside it. `greet()` doesn't print `"hello"` anywhere by itself — it
*becomes* the value `"hello"`, wherever it was called from, the same way
`2 + 2` becomes `4` wherever it appears. If you wanted to see it, you'd
need to do something with that returned value yourself, such as
`console.log(greet())`.

**PL lens — expressions versus statements, a distinction that explains
why some code "becomes a value" and some code doesn't.** `2 + 2` and
`greet()` are **expressions** — pieces of code that evaluate to a value,
which can be used wherever a value is expected (stored in a variable,
passed to another function, compared). `function greet() { ... }`,
`return ...`, and `if (...) { ... }` are **statements** — instructions
that make something happen or control what runs next, but don't
themselves evaluate to a usable value. You can write `var x = greet();`
(an expression's value, stored) but never `var x = return "hi";` (a
statement isn't a value to store). Keeping this straight explains why
some code can be nested inside other code and some can't.

**Walkthrough — parameters, the way a function receives information.**

```javascript
function greet(name) {
  return "hello, " + name;
}
```

`name` here is a **parameter** — a placeholder for whatever value the
function is given when it's actually called. `greet("Mike")` runs the
function with `name` set to `"Mike"` for that one call, and returns
`"hello, Mike"`. A different call, `greet("Jane")`, gets its own separate
`"Jane"` — nothing about one call affects another. This is the entire
mechanism `handleRequest` uses: it's a function with one parameter (the
request), and what it returns is treated as the response.

**PL lens — parameter versus argument, a distinction worth having exactly
right, since both words get used constantly from here on.** `name` in
`function greet(name) { ... }` is the **parameter** — the placeholder
name written into the function's own definition. `"Mike"` in `greet("Mike")`
is the **argument** — the actual, real value handed over at the moment of
a specific call. The parameter is part of the function's design, written
once; the argument is different every time the function is called. This
project will keep both words precise rather than using them
interchangeably, since real technical writing (documentation, error
messages, job interviews) does the same.

**SE lens — reuse: the entire reason this is worth doing at all.**
Without functions, "say hello to someone" would have to be retyped, in
full, everywhere it's needed — and fixing a bug in that logic would mean
finding and fixing every single copy. A function written once can be
called from as many places as needed, and fixed in exactly one place if
it's ever wrong. This principle — write logic once, reuse it by name,
change it in one place — will reappear, at larger and larger scale,
through this entire project: `handleRequest` itself is one function
called from one place right now; later lessons will build many functions,
called from many places, all leaning on this exact same idea.

---

## Step 2.5 — Objects, From Zero

`handleRequest` is about to return something more than plain text — a
small bundle of labeled information. Before writing that, meet the tool
that makes it possible.

```javascript
var user = { name: "Mike", age: 34 };
```

**PL lens — object literal syntax versus the object it produces.**
`{ name: "Mike", age: 34 }`, written directly in your code, is an
**object literal** — the *syntax* used to describe an object's starting
shape and values. The moment this line runs, that syntax produces a real
**object** — an actual value that exists while your program runs, stored
in the variable `user`. The distinction matters later: you'll sometimes
build objects with this literal syntax, and sometimes receive an object
that already exists (like `request`, built by this lab before your code
ever runs) — both are the same kind of value, just created two different
ways.

**Walkthrough.** `{ name: "Mike", age: 34 }` is an **object** — a single
value that bundles several *named* pieces of data together, each written
as a `key: value` pair, separated by commas, inside curly braces. An
object's pieces are accessed by *name*, not position (a different tool,
an **array**, handles ordered lists accessed by position — covered next,
right before it's needed): `user.name` reads `"Mike"`, `user.age` reads
`34`.
The names (`name`, `age`) are called **keys** (or, less formally,
**properties** or **fields** — all three words mean the same thing, and
you'll see all three used in real documentation); the values (`"Mike"`,
`34`) can be anything at all — a string, a number, even another object.

**Walkthrough — `user.name`, dot notation, reading a value back out.**
Once you have an object, `.` followed by a key name reads that key's
current value. `user.name` is itself a real expression — it evaluates to
`"Mike"`, exactly the same value that was written when the object was
created — and can be used anywhere a value is expected: printed, compared,
handed to another function, or, as you're about to do, built directly
into a new object of your own.

**CS lens — encapsulation: bundling related data into one value, instead
of many loose ones.** You could write `var userName = "Mike"; var userAge
= 34;` instead — two separate, independent variables, with nothing in the
code itself showing that they belong together. Wrapping related pieces of
data into a single value that gets passed, returned, and stored as one
unit is called **encapsulation** — the object *is* the boundary around
"everything that belongs to this one user." `handleRequest`'s entire
contract — return one object holding both a status and a body together —
depends on exactly this: two pieces of information that only make sense
paired together, bundled into one value instead of returned as two
disconnected ones.

**CS lens — reference semantics: `request` isn't a copy, it's the exact
same object everywhere it's passed.** When an object is passed into a
function (as a parameter) or handed from one piece of code to another, no
new copy is made — every place holding that object is holding a
**reference** to the exact same underlying value in memory. This matters
concretely, soon: a later lesson has the router *add a new field* onto
the same `request` object your handler receives (`request.params = ...`)
before calling your function — that only works, and only makes sense,
because "the request object the router built" and "the request object
your handler reads" are not two separate copies; they're the literal same
object, referenced from two different places. (This is different from a
plain value like a string or a number, which *is* copied wherever it's
assigned — an important distinction, named here so it isn't a surprise
the first time an object is changed out from under you.)

**SE lens — an open shape, built to grow without breaking anything that
already works.** `user` has exactly the fields it has — nothing stops a
*different* object from having more fields, or fewer. This matters for
`request` specifically: later lessons attach new fields onto it
(`params` in lesson 3, `query` in lesson 4) without ever having to change
code written earlier that only reads the fields it already knew about.
An array couldn't offer this as cleanly — inserting a new value at the
front would shift every other value's position, silently breaking any
code that read by index. An object's named-field shape is what makes
this kind of safe, incremental growth possible.

---

## Step 2.6 — Arrays, From Zero

One response coming up (Step 4) needs to return more than one user at
once. Objects bundle *named* fields together; a different tool is needed
for "a list of things," in order, with no names attached to each
position.

```javascript
var users = [
  { name: "Mike", age: 34 },
  { name: "Jane", age: 29 },
];
```

**Walkthrough.** `[ ... ]` is an **array** — an ordered list of values,
written between square brackets, separated by commas. Unlike an object,
an array's items aren't accessed by a named key — they're accessed by
**position**, called an **index**, starting at `0`: `users[0]` reads the
first item (`{ name: "Mike", age: 34 }`), `users[1]` reads the second.
This "count from zero" convention is a real, permanent fact about this
language (and most others) — the first item is always at index `0`, not
`1`.

**Walkthrough — `.length`, and mixing objects inside an array.** Every
array has a `.length` field — `users.length` is `2` here, always kept
correct automatically as items are added or removed. Notice, too, that
each *item* in this array is itself an object, with its own named
fields — arrays and objects nest inside each other freely: an array of
objects, an object containing an array, an array of arrays, all
completely ordinary. `users[0].name` reads `"Mike"` — index into the
array first, then dot into the object it holds.

**CS lens — position versus name, the real difference between an array
and an object.** An object answers "give me the thing named `X`"; an
array answers "give me the thing at position `N`." Neither is better in
general — they answer different questions. A collection of same-shaped
items where *order* matters, and no natural name exists for each one
(user #1, user #2, user #3 — not "Mike's field" and "Jane's field") is
exactly when an array is the right tool; a fixed set of *named*,
different-meaning fields (a `status` and a `body`, meaning two different
things) is exactly when an object is.

**PL lens — array literal syntax versus the array it produces, the exact
same distinction Step 2.5 named for objects.** `[ { ... }, { ... } ]`,
written directly in code, is an **array literal** — syntax describing an
array's starting contents. Running that line produces a real array
value, stored in `users`, that can grow, shrink, or be read from for as
long as your program keeps a reference to it.

---

## Step 3 — Write the Smallest Possible `handleRequest`

Replace the contents of `server.js` with this smaller version (do not append a
second handler below the starter):

```javascript
function handleRequest(request) {
  return { status: 200, body: "Hello" };
}
```

Click **Send** again. The Response tab now shows a real `200`, with the
body `"Hello"`.

**Walkthrough — the object you returned.** `{ status: 200, body: "Hello" }`
is an **object** — a value made of named fields, each holding its own
piece of data, written as `name: value` pairs inside curly braces. This
lab expects every response to be shaped this way: a `status` (a number,
the same kind of status code real web traffic uses — `200` means
"succeeded"), and a `body` (whatever data you actually want to send
back — here, just a plain piece of text).

**CS lens — a structural contract: nothing enforces this shape except
agreement.** Nothing in this language stops you from returning
`{ ok: true }` instead — no compiler, no type system here rejects it.
This lab's Postman panel simply expects a `status` and a `body` to exist
on whatever comes back, and reads them if they're there. A contract
enforced only by "the shape the code expects," rather than by an
explicit, checked type declaration, is called a **structural contract**
(sometimes "duck typing" — if it has a `status` and a `body`, it's
treated as a valid response, regardless of what else it might have or
how it was built). This is a real, common pattern in JavaScript, worth
naming honestly rather than assuming a stricter guarantee that isn't
actually there.

**CS lens — a representation, not the real thing itself.** This object
isn't literally a network response — no bytes have gone anywhere yet.
It's a **representation**: a piece of data this lab uses to *model* what
an HTTP response would contain, which the Postman panel then renders for
you to read. `request` works the same way in reverse — it represents an
incoming HTTP request, modeled as a plain object, without any of the raw
networking actually happening underneath it. Building simplified,
in-memory stand-ins for real-world concepts like this is called **domain
modeling**: the "request" and "response" objects in this project are
domain models of real HTTP concepts, not the concepts themselves.

**Walkthrough — `request`, received but ignored, on purpose, for now.**
`handleRequest(request)` takes a parameter for the incoming request, but
this first version never looks at it — every request, no matter what it
actually asked for, gets back the identical `"Hello"`. That's an honest,
deliberate simplification for this very first step: proving that a
function can be called at all, and that what it returns is what comes
back, before making it do anything more interesting.

**CS lens — determinism, worth naming while it's still true.** Right
now, `handleRequest` always returns the exact same response, no matter
what request comes in, no matter how many times you send it. Code whose
output depends only on its input — the same input always producing the
same output — is called **deterministic**. Deterministic code is far
easier to reason about and test than code that doesn't have this
property, precisely because there's nothing hidden that could make two
identical calls behave differently. This won't stay true forever in this
project (a later lesson introduces stored data that can change between
requests), but it's worth knowing, by name, while it's still the case.

**SE lens — convention over configuration, a real tradeoff, not free
simplicity.** This lab could have required you to declare the shape of a
valid response somewhere explicit — a type, a schema, a registration
step — and reject anything that didn't match. It doesn't. It trusts you
to follow the agreed convention (`status`, `body`) and simply reads
whatever you return. This tradeoff — less upfront ceremony, in exchange
for no safety net if you get the shape wrong — is called **convention
over configuration**, and it's a real, common choice real frameworks make
too. The cost shows up concretely in the next section: nothing catches a
mistyped field name for you.

---

## Step 4 — Actually Look at the Request

Real endpoints respond differently depending on what was asked. Update
`handleRequest`:

```javascript
function handleRequest(request) {
  if (request.path === "/users") {
    return { status: 200, body: [{ id: 1, name: "Mike" }, { id: 2, name: "Jane" }] };
  } else {
    return { status: 404, body: "Not found" };
  }
}
```

Click **Send** with the path still set to `/users` — you get the two
users back. Change the path in the request panel to something else, like
`/orders`, and Send again — a real `404`.

**Walkthrough — `request.path`, reading a field off the object you were
given.** `request` is an object too, built by this lab's Postman panel,
with its own fields — `method`, `path`, and others you haven't needed
yet. `request.path` reads the `path` field off of it: the text that was
typed into the Postman panel's path input. `===` checks whether two
values are exactly equal; `request.path === "/users"` is `true` only when
the path typed in is precisely `"/users"`, character for character.

**CS lens — an API surface, growing one field at a time.** `request.path`
is the first field of `request` you've actually used — but it already
has others (`method`, and more arriving in later lessons: `query`,
`body`, `params`). The complete set of fields and behaviors a piece of
code exposes for others to use is called its **API surface**. This
project's `request` object's API surface grows gradually, lesson by
lesson, exactly as each new field becomes genuinely needed — not handed
to you all at once up front.

**Walkthrough — `if`/`else`, deciding between two responses.** This is
the first time `handleRequest` returns something different depending on
what it was actually asked — an `if`/`else` chooses between the two
`return` statements based on that one check. Whichever branch runs,
`return` still means the same thing it always has: hand back a value, and
stop.

**CS lens — dispatch, a decision tree with exactly one branch, so far.**
Choosing which behavior to run based on an incoming value — here, "does
the path equal `/users`?" — is called **dispatch**. What you just wrote
is the simplest possible form of it: a **decision tree**, one yes/no
question deep, with one path leading to the users response and the other
to a `404`. This is real dispatch, doing real work — it just doesn't
scale yet, which Step 4 comes back to below.

**CS lens — status codes are a real, named, extensible convention, not a
short fixed list to memorize.** `200` and `404` are two members of a much
larger, standardized system: every status code's *first digit* tells you
its category before you even know the specific number — `2xx` means
success, `4xx` means the client asked for something wrong or invalid,
`5xx` (met later) means the server itself failed while trying to answer.
This project builds up the specific numbers worth knowing gradually,
lesson by lesson, exactly as they become genuinely needed — no giant table
to memorize up front.

**Connect to the real world — status codes are a real, standardized
protocol, extensible enough that a joke became part of it.** In 1998, an
April Fools' internet proposal called RFC 2324 defined status `418`,
`I'm a teapot` — a real, documented status code, meant as a joke, for a
theoretical protocol for controlling teapots. It should have stayed a
curiosity. Decades later, real production systems — including Google's
own developer APIs — genuinely return `418` on purpose in specific
situations, because the actual protocol never forbade using it, and
enough real software started supporting it that removing it would break
things. The lesson worth taking from this isn't the joke — it's that
status codes are a real, open, agreed-upon *protocol* between clients and
servers, not a hardcoded list baked into any one company's software.
Anyone can propose a new one; whether other software actually honors it
is a separate, real question about adoption, not authority.

**SE lens — one function, quietly doing two jobs at once.** Look closely
at what `handleRequest` is actually responsible for right now: deciding
*which* request this is (checking `request.path`), and deciding *what to
do about it* (building the actual response). Those are two genuinely
different jobs, currently living inside the same `if`/`else`, with no
line between them. This convergence is fine at one path — it stops being
fine fast.

**Forward connection — this will not scale, and that's the point.** Real
backends handle dozens, sometimes hundreds, of different paths. Writing
one long `if`/`else` chain checking every single one, all inside one
function, gets unmanageable fast — imagine twenty paths, each needing its
own branch, all crammed into `handleRequest`. That's dispatch done by
**computation** — re-checking a chain of conditions, one at a time, every
single request. A **lookup** — going straight to the right answer by key,
the way a dictionary look-up in a real object does — is faster to write,
faster to read, and doesn't grow into an unmanageable chain. That real,
felt problem — not a hypothetical one — is exactly what motivates
building a proper **router** in the next lesson: replacing dispatch-by-
computation with dispatch-by-lookup, and, along with it, finally
separating "which request is this" from "what should happen."

---

## Connect the Pieces

```
Postman panel        builds a request object from what you typed in
      |               (method, path, ...) — responsible for exactly
      v               this, and nothing about how it's handled
this lab's bridge     invokes handleRequest(request) — inversion of
      |               control: this lab decides when your code runs
      v
handleRequest         your code — responsible only for turning one
      |               request into one { status, body } response
      v
Postman panel         reads status/body off whatever came back and
                      renders it in the Response tab
```

**SE lens — separation of concerns and single responsibility, visible
even in a system this small.** Three different pieces of code just
worked together, and each one had exactly one job: the Postman panel
only builds requests and displays responses — it never decides what a
response should contain. This lab's hidden bridge only connects "Send
was clicked" to "call `handleRequest`" — it never decides what the
response *is*, either. `handleRequest` only decides what response a
given request deserves — it never has to know how it was invoked, or how
its return value gets displayed. Keeping each piece's job narrow and
distinct like this is **separation of concerns**; each piece having
exactly one reason to change is the **single responsibility principle**.
Both ideas will come up again, by name, throughout this entire series,
because this project keeps building new pieces the exact same way.

**CS lens — control flow and data flow, two different things happening
at once, worth telling apart.** The diagram above traces **data flow** —
where the request object and response object actually travel. A
separate thing is happening simultaneously: **control flow** — which code
actually *executes*, and in what order (you click Send → this lab's
bridge runs → `handleRequest` runs → control returns to the bridge →
the Response tab updates). Data flow and control flow usually move
together, but they aren't the same question: data flow asks "where does
this value go," control flow asks "what code actually runs, in what
order." Keeping them separate in your head becomes essential once this
project reaches middleware — code that runs *in* the control flow without
being where the interesting data actually lives.

---

## What Breaks Without This

**Forgetting `return` inside a branch** (writing the object but not
returning it): `handleRequest` finishes without ever handing back a
value. This lab has nothing to send as a response, and the Response tab
correctly tells you so — a real, honest consequence of a real, common
mistake, not a special case this lab hides from you.

**Typing the path check as `request.path = "/users"` (one equals sign,
not two or three):** this doesn't check equality at all — a single `=`
**assigns** a value rather than comparing one, silently overwriting
`request.path` with the string `"/users"` and evaluating to that string
as a value, which is truthy — meaning this specific branch would run for
*every* request, indistinguishable from an infinite string of coincidence
until you tried a different path.

---

## Definition of Done

- [ ] You've run the starter successfully, changed its response, and deliberately renamed then restored the handler to understand a missing-function error
- [ ] `handleRequest` returns a real `{ status: 200, body: ... }` response for `/users`
- [ ] A path other than `/users` correctly returns a `404`
- [ ] You can explain what a function parameter is and what `return` does, in your own words
- [ ] You can explain the difference between a parameter and an argument
- [ ] You can explain what an object is, how dot notation reads a value off one, and what reference semantics means for an object like `request`
- [ ] You can explain what an array is, how to index into one starting at `0`, and when an array is the right tool instead of an object
- [ ] You can explain the client-server model, using this lab's Postman panel as the client
- [ ] You can explain what inversion of control means, using this lab's hidden bridge as the example
- [ ] You can explain the difference between this project's conventions (`handleRequest`, `status`, `body`) and real JavaScript language features
- [ ] You can explain why every request currently re-runs your entire file from scratch, what "stateless" means, and why a real server's lifecycle doesn't work that way
- [ ] You can explain why status codes are a real, extensible protocol rather than a fixed list
- [ ] You can explain the difference between dispatch by computation (this lesson's `if`/`else`) and dispatch by lookup, and why one long `if`/`else` chain won't scale to a real backend with many routes

---

*Next: a router — replacing the `if`/`else` chain with a structured way to
register one handler per path.*
