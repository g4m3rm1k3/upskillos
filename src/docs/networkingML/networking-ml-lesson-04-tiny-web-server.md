# Lesson 4 — A Tiny Web Server, No Framework

## What you'll learn
- Building an actual **routing table** by hand — the exact mechanism
  `@app.get("/path")` (Lesson 18) is a friendlier syntax for
- Parsing query parameters (`?name=value`) from a raw request path,
  entirely by hand
- Dispatching to different handler functions based on method + path,
  mirroring FastAPI's decorator-based routing conceptually
- Why FastAPI/`uvicorn` exist — what real problems this hand-built version
  has that a real framework actually solves

## What you'll build
A small server with multiple routes (`/`, `/hello`, `/echo?message=...`),
each handled by a separate Python function, dispatched to based on the
parsed method and path — a genuine, if minimal, working "framework" of
your own.

## The question
Lesson 2's server had exactly one `if path == "/": ... else: ...` branch —
fine for one route, unworkable for a real site with many. Lesson 18's
FastAPI used `@app.get("/signup")` to register a handler. What does a
routing system actually need to track and check, structurally, to support
an arbitrary number of routes cleanly?

## 1. Predict

You already built a JS object used as a lookup table in
[[frontend-curriculum]] Lesson 5 (`keysPressed`). Predict: could a similar
key-based lookup structure — mapping a route's path (as a string key) to
the specific function that should handle it (as the value) — replace a
long chain of `if path == "/": ... elif path == "/hello": ... elif ...`?
What would the "key" need to include, beyond just the path, to also
account for different HTTP methods on the same path?

## 2. Try it — a routing table

```python
import socket

def handleHomePage(queryParameters):
    return "<h1>Welcome to the home page</h1>"

def handleHelloPage(queryParameters):
    return "<h1>Hello, world</h1>"

routingTable = {
    ("GET", "/"): handleHomePage,
    ("GET", "/hello"): handleHelloPage,
}

def buildHttpResponse(statusCode, statusText, bodyText):
    bodyBytes = bodyText.encode("utf-8")
    responseLines = [
        "HTTP/1.1 " + str(statusCode) + " " + statusText,
        "Content-Type: text/html; charset=utf-8",
        "Content-Length: " + str(len(bodyBytes)),
        "Connection: close",
        "", ""
    ]
    return "\r\n".join(responseLines).encode("utf-8") + bodyBytes
```

### What this code does

**`routingTable = { ("GET", "/"): handleHomePage, ("GET", "/hello"): handleHelloPage }`**
- **This is the direct answer to your Predict question.** The dictionary
  key is a **tuple** — `(method, path)` together — not just the path
  alone, meaning `("GET", "/data")` and `("POST", "/data")` can be
  registered as two completely separate entries pointing at two different
  handler functions, exactly matching how `@app.get("/signup")` and
  `@app.post("/signup")` (Lesson 18) are genuinely distinct routes despite
  sharing a path.
- **The dictionary's *values* are the actual function objects
  themselves** — `handleHomePage`, not `handleHomePage()` (no
  parentheses; calling it now would run it immediately and store its
  *return value*, not the function). Storing a function as a plain value
  in a data structure, to be called *later*, is the exact same "pass the
  function itself, not its result" principle from Lesson 4's
  `setInterval(spawnTarget, ...)` in the frontend curriculum, now
  appearing in Python instead of JS.

**Each handler function takes `queryParameters` and returns a plain
string (the body HTML)** — a deliberate, minimal convention this
hand-built system defines for itself, standing in for the far richer
conventions a real framework establishes (return types, automatic JSON
serialization, and so on, from Lesson 18's FastAPI).

## 3. Why — dispatching based on the routing table, plus parsing query parameters

```python
def parseQueryParameters(path):
    if "?" not in path:
        return path, {}

    basePath, queryString = path.split("?", 1)
    queryParameters = {}
    for pair in queryString.split("&"):
        key, value = pair.split("=", 1)
        queryParameters[key] = value

    return basePath, queryParameters

def handleRequest(method, path):
    basePath, queryParameters = parseQueryParameters(path)
    routeKey = (method, basePath)

    if routeKey in routingTable:
        handlerFunction = routingTable[routeKey]
        bodyText = handlerFunction(queryParameters)
        return buildHttpResponse(200, "OK", bodyText)
    else:
        return buildHttpResponse(404, "Not Found", "<h1>404 Not Found</h1>")
```

**`parseQueryParameters(path)`**
- `"?" not in path` — checks whether the path even has query parameters at
  all (e.g. `/hello` has none; `/echo?message=hi` does) — a genuine
  branch needed since not every request includes them.
- `basePath, queryString = path.split("?", 1)` — splits into the actual
  route path (`/echo`) and everything after the `?` (`message=hi`), once,
  at the *first* `?` only.
- `for pair in queryString.split("&")` — multiple query parameters are
  separated by `&` (e.g. `?name=Alex&age=25`); this splits them into
  individual `key=value` pairs, one iteration per pair.
- `key, value = pair.split("=", 1)` — splits each pair at its first `=`
  into the parameter name and its value, building up `queryParameters` as
  an ordinary dictionary. **You have now hand-built exactly what
  `request.query_params` (or FastAPI's automatic function-parameter
  binding) does for you invisibly** — this is genuinely the same parsing
  work, just made explicit.

**`if routeKey in routingTable: handlerFunction = routingTable[routeKey]; bodyText = handlerFunction(queryParameters)`**
- **This is the dispatch mechanism** — looking up the `(method, basePath)`
  tuple in the routing table, and if found, calling whatever function was
  registered there, passing it the parsed query parameters. This single
  `if`/lookup replaces what would otherwise be a long, unscalable
  `if`/`elif` chain checking every possible route by hand, one at a time.
- **The `else` branch — falling through to a 404** — is exactly what
  `@app.get(...)`'s absence for an unmatched route produces automatically
  in FastAPI; here, you're the one responsible for remembering to handle
  the "no matching route" case explicitly.

## 4. Change one thing

```diff
 def handleHelloPage(queryParameters):
-    return "<h1>Hello, world</h1>"
+    name = queryParameters.get("name", "world")
+    return "<h1>Hello, " + name + "</h1>"
```

**What changed:** the handler now reads a `name` query parameter, with a
fallback default.
**What did not change:** the routing table entry, the dispatch logic, or
`parseQueryParameters` — this change is entirely contained inside one
handler function.
**Worth noticing**: `.get("name", "world")` — a dictionary method
returning the value for `"name"` if present, or the given default
(`"world"`) if not — avoids a `KeyError` that plain `queryParameters["name"]`
would raise if the parameter were missing (visiting `/hello` with no query
string at all). Visiting `/hello?name=Alex` now correctly renders
"Hello, Alex" — a real, working parameter-driven route, built entirely
from the pieces in Section 3.

## 5. Put it in the project — the full server, echoing a request back

```python
def handleEchoPage(queryParameters):
    message = queryParameters.get("message", "")
    return "<h1>You said: " + message + "</h1>"

routingTable[("GET", "/echo")] = handleEchoPage

serverSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
serverSocket.bind(("127.0.0.1", 8080))
serverSocket.listen(1)
print("Listening on http://127.0.0.1:8080")

while True:
    connectionSocket, clientAddress = serverSocket.accept()
    requestBytes = connectionSocket.recv(4096)
    requestText = requestBytes.decode("utf-8")

    requestLine = requestText.split("\r\n")[0]
    method, path, httpVersion = requestLine.split(" ")

    print(method, path)
    responseBytes = handleRequest(method, path)

    connectionSocket.send(responseBytes)
    connectionSocket.close()
```

### Code walkthrough — what's new here

**`routingTable[("GET", "/echo")] = handleEchoPage`**
- Adding a route to the dictionary **after** its initial creation — proving
  the routing table is just an ordinary, mutable dictionary, not special
  syntax; new routes can be registered anywhere, in any order, the same
  way any dictionary can gain new keys over time.

**The `while True` accept loop** — reused directly from Lesson 1's echo
server, now combined with everything since: parse the request line,
dispatch through the routing table, send back whatever `handleRequest`
constructs. **This is a genuine, working multi-route web server, built
from nothing but a socket, string parsing, and a dictionary** — visiting
`http://127.0.0.1:8080/echo?message=Hello` in a real browser now actually
displays "You said: Hello," dispatched entirely through code you wrote
and can read every line of.

### What happens

Each incoming connection is parsed for its method/path, query parameters
are extracted, the routing table is checked for a matching handler, that
handler runs and produces body text, and a complete, valid HTTP response
(Lesson 2) is sent back — the same overall shape as any real web
framework, minus the many real-world concerns Section 6 examines.

## 6. Trap — what this version genuinely can't do (be honest about it)

Predict, then test: open **two** browser tabs, both pointed at your
server, and load them at nearly the same instant.

You'll likely notice one tab loads noticeably after the other, rather
than both loading simultaneously. **This is the real, structural
limitation flagged back in Lesson 1: this server handles exactly one
client at a time, fully, before looping back to `accept()` for the
next.** A real framework like FastAPI, run via `uvicorn`, handles many
simultaneous requests through actual concurrency (async I/O, or multiple
worker processes/threads — genuinely beyond this lesson's scope to
build) — **this is one of several real, concrete reasons frameworks
exist**, not because hand-rolling HTTP parsing is impossible (you just
did it), but because production concerns — true concurrency, security
hardening against malformed/malicious input, HTTPS/TLS, robust error
handling for every edge case a real network throws at you, WebSocket
support, and dozens of other genuinely hard problems — are extensively
solved, tested, and maintained in a real framework, and reinventing all
of them correctly, yourself, for every project, would be a poor use of
time once you understand *why* they exist rather than treating them as
unquestioned magic.

## 7. Exercise

- **Predict:** If two routes were registered as `("GET", "/data")` and
  `("get", "/data")` (different casing on the method), would both work
  identically for an incoming `GET` request? (Hint: think back to Lesson
  2's header-casing exercise — HTTP methods are conventionally uppercase,
  but does *your* routing table's exact-match dictionary lookup care about
  that convention, or only about literal string equality?)
- **Modify:** Add a route supporting a **path parameter** (e.g.
  `/users/alex` where `alex` is dynamic) — you'll need to move beyond
  exact-match dictionary lookups toward splitting the path into segments
  and checking a pattern, a real, harder routing problem worth attempting
  even partially.
- **Break:** Send a request with no query string to a handler that calls
  `queryParameters["someKey"]` directly (no `.get()` default). Confirm
  this crashes the single connection being handled — then reason about
  whether this crash affects the *server process itself*, or just that
  one client's connection (test by trying a second request afterward).
- **Trace:** Compare this lesson's `routingTable` dictionary directly
  against FastAPI's `@app.get("/signup")` decorator (Lesson 18) — in your
  own words, describe what the decorator is actually doing to
  FastAPI's *own* internal routing table, using this lesson's explicit
  version as your mental model for what's normally hidden.

## What to remember
- A routing table is fundamentally a dictionary keyed by (method, path),
  mapping to handler functions — `@app.get(...)` (Lesson 18) is
  syntactic sugar over exactly this structure, not a fundamentally
  different mechanism.
- Query parameter parsing (`?key=value&key2=value2`) is plain string
  splitting — `.split("?")`, `.split("&")`, `.split("=")` — with no
  hidden complexity once written out explicitly.
- Storing a function itself (no parentheses) as a dictionary value,
  called later through a lookup, is the same "pass the function, not its
  result" principle from callback-based code in the frontend curriculum.
- This hand-built server's real limitation — handling one client fully
  before the next — is a genuine, honest reason frameworks/`uvicorn`
  exist, alongside security, TLS, and dozens of other hard problems worth
  not reinventing yourself in most real projects.

## Next lesson
Lesson 5 adds **WebSockets** — a persistent, bidirectional connection that
stays open (unlike every request/response pair built so far, which closes
immediately after one exchange) — building a live chat server, and the
first frontend tie-in: a real-time connection/message visualizer in the
browser.
