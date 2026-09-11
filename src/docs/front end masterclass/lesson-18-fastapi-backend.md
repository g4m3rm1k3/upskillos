# Lesson 18 — FastAPI Backend Basics

## What you'll learn
- How a route decorator connects a URL + HTTP method to a Python function
- Pydantic models — validation that mirrors what Lesson 17's HTML did natively, now enforced server-side
- CORS — why your frontend (one origin) and backend (a different origin) can't just talk to each other by default, and the specific fix
- Running the server and confirming it works, independent of any frontend

## What you'll build
A minimal FastAPI backend with one `POST /signup` endpoint that accepts the
same username/email fields from Lesson 17's form, validates them
server-side, and returns a JSON response — no frontend involved yet, that's
Lesson 19.

## The question
Lesson 17's `required`/`type="email"` validation happens entirely in the
browser — which means it's trivial to bypass (anyone can submit a raw HTTP
request directly, skipping your HTML form entirely, with a tool like
`curl`). If validation can be bypassed client-side, where does validation
that actually can't be skipped need to live?

## 1. Predict

You already know Python's basic types (str, int) and that FastAPI uses
"a little" of what you've hacked together before. Predict: if a backend
needs to guarantee "email must be a string, age must be a number 13-120"
*no matter what* a client sends — even a malicious or malformed request —
should that check live in the same place as the route logic itself, or
somewhere more structured and reusable?

## 2. Try it

```bash
pip install fastapi uvicorn --break-system-packages
```

**`main.py`**
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Backend is running"}

@app.get("/hello/{name}")
def say_hello(name: str):
    return {"greeting": "Hello, " + name}
```

Run it:
```bash
uvicorn main:app --reload
```

### What this code does

**`app = FastAPI()`**
- Creates **one instance** of the `FastAPI` class (same `new`-adjacent
  pattern conceptually as Lesson 5/9's class instances, though Python's
  `ClassName()` doesn't need a `new` keyword the way JS does) — this
  instance is the entire application; every route you define attaches to
  it.

**`@app.get("/")`**
- A **decorator** — Python syntax that wraps the function defined directly
  below it, registering `read_root` as the function to run whenever a
  **GET** request arrives at the path `"/"`. The `@` syntax itself just
  means "pass the following function into `app.get("/")`'s return value as
  an argument" — decorators are a general Python feature, not
  FastAPI-specific, but this is likely your first hands-on use of one.
- **This is the direct backend equivalent of Lesson 1's
  `addEventListener("click", callback)`**: both are "register this function
  to run when this specific trigger occurs" — the trigger there was a
  browser click event; here it's an incoming HTTP request matching a method
  + path.

**`def read_root(): return {"message": "Backend is running"}`**
- Returning a plain Python `dict`. FastAPI automatically serializes this to
  JSON in the actual HTTP response — you never call anything like
  `json.dumps` yourself; this conversion is handled for you, symmetrically
  to how `response.json()` on the frontend (Lesson 6) automatically parsed
  JSON back into a JS object.

**`@app.get("/hello/{name}") def say_hello(name: str): ...`**
- `{name}` in the path is a **path parameter** — FastAPI extracts whatever
  segment of the URL appears there (e.g. `/hello/Alex` → `"Alex"`) and
  passes it as an argument to your function, matched by parameter name.
- `name: str` — a **type annotation**. FastAPI uses this not just as a hint
  for you the reader, but actively: it validates and converts the incoming
  value to match, and (this matters a lot going forward) auto-generates API
  documentation from these annotations, visible by visiting `/docs` in your
  browser once the server is running — worth checking out immediately, it's
  one of FastAPI's most useful built-in features.

**`uvicorn main:app --reload`**
- `uvicorn` is the actual **server** that runs your FastAPI app — FastAPI
  itself is a framework describing *what* to do with requests; `uvicorn` is
  what actually listens on a network port and hands incoming requests to
  it. `main:app` means "in the file `main.py`, use the object named `app`."
  `--reload` restarts the server automatically whenever you save a code
  change — essential during development, something you'd remove in
  production.

## 3. Why — Pydantic models for real validation

```python
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr, Field

app = FastAPI()

class SignupData(BaseModel):
    username: str = Field(min_length=3)
    email: EmailStr
    age: int = Field(ge=13, le=120)

@app.post("/signup")
def signup(data: SignupData):
    return {"status": "ok", "username": data.username}
```

**`class SignupData(BaseModel): ...`**
- A **Pydantic model** — a class (Lesson 5's `class`/`constructor` pattern,
  now in Python instead of JS) whose entire purpose is describing the
  *shape* data must have. `BaseModel` is Pydantic's own base class you
  inherit from — you don't write `__init__` yourself; Pydantic generates
  validation and construction logic automatically from the type annotations
  you declare.

**`username: str = Field(min_length=3)`**
- A class-level annotation, not a method — `username` must be a string, and
  `Field(min_length=3)` adds a validation constraint beyond just the type:
  at least 3 characters. **This directly mirrors Lesson 17's
  `minlength="3"` HTML attribute** — same rule, enforced server-side now,
  where it actually cannot be bypassed by skipping the HTML form.

**`email: EmailStr`**
- `EmailStr` is a special Pydantic type (not a plain `str`) that
  automatically validates email-shaped strings — **the direct backend
  equivalent of Lesson 17's `type="email"`**, again enforced somewhere a
  malicious or buggy client can't skip.

**`age: int = Field(ge=13, le=120)`**
- `ge`/`le` — "greater than or equal" / "less than or equal." **Directly
  mirrors Lesson 17's `min="13" max="120"`.** By this point, the pattern
  should be clear: nearly everything Lesson 17 validated natively in HTML
  has a direct Pydantic equivalent — the *concepts* transfer completely,
  only the *syntax and enforcement location* differ.

**`@app.post("/signup") def signup(data: SignupData): ...`**
- `@app.post` — same decorator pattern as `@app.get`, but for **POST**
  requests specifically (matching the "submit new data" nature of a signup
  form, versus GET's "just retrieve something" nature — a real, meaningful
  HTTP convention, not an arbitrary choice).
- `data: SignupData` — **this is where the real payoff happens.** FastAPI
  reads the incoming request's JSON body, and *before your function body
  even runs*, attempts to construct a `SignupData` instance from it. If the
  incoming data doesn't satisfy every annotation and `Field` constraint —
  missing `email`, an age of `5`, a 2-character `username` — FastAPI
  automatically returns a `422 Unprocessable Entity` error response with
  details about exactly what failed, and **your `signup` function's body
  never runs at all** for invalid data. This is the direct answer to your
  Predict question: validation lives in the model, structured and reusable,
  completely separate from (and enforced *before*) your actual route logic.

## 4. Change one thing

```diff
 class SignupData(BaseModel):
     username: str = Field(min_length=3)
     email: EmailStr
     age: int = Field(ge=13, le=120)
+    newsletter: bool = False
```

**What changed:** one new field, with a **default value** (`False`).
**What did not change:** nothing about `username`/`email`/`age`'s
validation — Pydantic models are purely additive to extend, same principle
as Lesson 8's `WeatherState` exercise.
**Predict, then verify**: because `newsletter` has a default, it becomes
**optional** — a request omitting it entirely is still valid, and
`data.newsletter` will simply be `False` inside `signup`. Fields *without*
a default (like `username`, `email`, `age` above) are **required** by
Pydantic automatically — this default-vs-no-default distinction is exactly
how Pydantic expresses "required" without needing an explicit
`required=True` the way Lesson 17's HTML did.

## 5. Put it in the project — CORS

Start your server (`uvicorn main:app --reload`), then try opening a plain
HTML file (not served by FastAPI — just double-click it, or serve it from a
completely different local port) containing:

```html
<script>
  fetch("http://127.0.0.1:8000/")
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((err) => console.error(err));
</script>
```

Open the browser console. **You'll very likely see a CORS error** — the
request is blocked, even though the server is running correctly and would
have responded fine to a direct browser visit or `curl`.

**What's actually happening:**
- Browsers enforce a security rule called the **same-origin policy**: by
  default, JavaScript running on one **origin** (a specific combination of
  protocol + domain + port — e.g. `file://` or `http://127.0.0.1:5500`) is
  **not allowed** to read responses from a *different* origin (here,
  `http://127.0.0.1:8000`) via `fetch`, unless that other origin explicitly
  says it's allowed to.
- **CORS** (Cross-Origin Resource Sharing) is the mechanism servers use to
  explicitly opt in to this — the *server* has to send back specific
  headers granting permission; the browser is what actually enforces the
  restriction, and it enforces it by default in the *absence* of those
  headers, not the presence of some blocking header.

**The fix:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**`app.add_middleware(CORSMiddleware, ...)`**
- **Middleware** is code that runs on *every* request/response passing
  through the app, before/after your actual route functions — a general
  concept, not CORS-specific. `CORSMiddleware` specifically adds the
  headers browsers check for.
- `allow_origins=["*"]` — `"*"` means "allow requests from any origin
  whatsoever." **This is fine, even standard, for local development, but a
  real security decision in production** — a real app would typically list
  specific allowed origins explicitly (e.g.
  `["https://myapp.com"]`) rather than wildcarding — worth knowing this now
  as a flagged caveat, not something to carry forward unquestioned into a
  real deployed project.

### What happens

With `CORSMiddleware` added and the server restarted (or already
auto-reloaded via `--reload`), the same `fetch` from a different origin now
succeeds — the browser sees the permission headers FastAPI's middleware
added to the response and allows your JavaScript to read the result.

## 6. Trap

Predict, then test: send a POST request to `/signup` with an age of
`"thirteen"` (the word, as a string) instead of `13` (a number) — you can
use FastAPI's own auto-generated docs at `http://127.0.0.1:8000/docs` to
try this directly, no separate frontend needed, by expanding the `/signup`
endpoint and using "Try it out."

**The trap: this fails validation, correctly, but notice it fails for a
*type* reason, not a *value* reason** — `age: int` demands an actual
integer; a non-numeric string can't even be converted, so the error message
you get back is about type coercion failing, distinctly different from the
`ge=13` constraint (which would instead reject a *valid* number like `5`
for being *too small*). **These are two different validation layers
happening in one annotation** (`int` for type, `Field(ge=13)` for range) —
worth being able to tell, from FastAPI's error response, which layer
actually rejected a given request, since debugging a real API means reading
these error shapes accurately.

## 7. Exercise

- **Predict:** If `SignupData` had `age: int = Field(ge=13, le=120)`
  changed to `age: int | None = Field(default=None, ge=13, le=120)`, would
  a signup request with no `age` field at all now succeed or fail? (The
  `|` here is Python's modern union-type syntax — `int | None` means "an
  int, or nothing.")
- **Modify:** Add a `GET /users/{username}` endpoint that just echoes back
  `{"username": username}` — reinforcing path parameters from Step 2,
  separate from the POST/body pattern of `/signup`.
- **Break:** Temporarily set `allow_origins=[]` (an empty list, allowing
  nothing) and retry the cross-origin `fetch` from Step 5. Confirm the
  error returns, then set it back.
- **Trace:** Using `/docs`, submit a `/signup` request missing the `email`
  field entirely. Read the actual JSON error response FastAPI returns —
  what does it tell you about *which* field failed and *why*, without you
  writing any error-handling code yourself?

## What to remember
- `@app.get`/`@app.post` decorators register functions to run for a
  specific HTTP method + path — conceptually the backend's version of
  `addEventListener`.
- Pydantic models validate incoming data structurally, *before* your route
  function runs — the server-side, unbypassable equivalent of Lesson 17's
  native HTML validation, concept-for-concept.
- CORS is the browser's same-origin policy in action; the *server* must
  explicitly opt in via headers (here, `CORSMiddleware`) for a different
  origin's JavaScript to read its responses — `allow_origins=["*"]` is a
  dev convenience, not a production default.
- FastAPI auto-generates interactive docs at `/docs` from your type
  annotations — genuinely useful for testing endpoints without a frontend
  at all.

## Next lesson
Lesson 19 connects Lesson 17's actual HTML form to this actual backend via
`fetch` — real request/response, real validation errors surfaced back to
the user, and Lesson 16's loading screen shown for the real (if brief)
network round-trip this time, not a simulated delay.
