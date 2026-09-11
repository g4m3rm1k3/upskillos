# Lesson 19 — AJAX Form Submission, For Real

## What you'll learn
- Sending a form's data as a JSON `fetch` body instead of letting the browser navigate
- Reading a real backend's validation errors (FastAPI's 422 response) and showing them to the user
- Wiring Lesson 16's loading screen to an actual network request instead of a fake delay
- The complete flow: native validation → prevent default → loading state → real request → real success/error handling

## What you'll build
Lesson 17's signup form, submitting via `fetch` to Lesson 18's `/signup`
endpoint — with a loading spinner during the request, and real validation
errors (both native, client-side, and from the server) shown to the user.

## The question
Lesson 17 ended with `FormData` collecting all the form's values into one
object, logged to the console. Lesson 18's `/signup` endpoint expects a
**JSON request body**, not URL query parameters and not the console. What
has to happen to that collected object to actually send it somewhere, and
what happens to whatever comes back?

## 1. Predict

You already combined `fetch` + `async`/`await` + `try`/`catch` in Lesson 6
and Lesson 11, for **GET** requests (asking for data). A form submission is
a **POST** (sending data). Predict: what parts of a `fetch` call do you
think need to change between "ask for data" and "send data" — is it just
the URL, or does something about the call's *shape* need to change too?

## 2. Try it — the request shape

```js
const response = await fetch("http://127.0.0.1:8000/signup", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ username: "alex", email: "alex@example.com", age: 25 })
});
```

### What this code does

**`fetch(url, { method: "POST", headers: {...}, body: ... })`**
- Every `fetch` call before this lesson (Lessons 6, 11) used only the URL —
  a single argument. **The second argument, an options object, is where a
  GET-vs-POST distinction, and any data you're sending, actually lives.**
  This is the direct answer to your Predict question: the URL alone was
  never the only thing that needed to change.

**`method: "POST"`**
- Overrides `fetch`'s default method, which is `GET` (used implicitly in
  every earlier lesson without ever needing to state it). Must match what
  the backend route expects — Lesson 18's `@app.post("/signup")` will
  reject (with a `405 Method Not Allowed`) a request sent with any other
  method.

**`headers: { "Content-Type": "application/json" }`**
- **Headers** are metadata about the request, separate from its actual
  content (the `body`). `Content-Type: application/json` tells the server
  "the body you're about to read is JSON-formatted text" — **this is not
  optional decoration; FastAPI specifically relies on this header to know
  how to parse the incoming body** into the `SignupData` Pydantic model
  from Lesson 18. Omitting or misstating this header is a common real bug
  where a backend receives a request but fails to parse its body correctly.

**`body: JSON.stringify({ username: "alex", ... })`**
- `fetch`'s `body` must be a **string** (or a few other specific types not
  covered here) — never a raw JS object directly. `JSON.stringify(...)`
  converts a JS object into its textual JSON representation — the exact
  inverse operation of `response.json()` (Lesson 6), which parses JSON text
  *back into* a JS object. **Every JSON-sending `fetch` call needs this
  conversion; every JSON-receiving one needs the reverse.**

## 3. Why — wiring the real form to the real backend

```html
<form id="signup-form">
  <label for="username">Username</label>
  <input type="text" id="username" name="username" required minlength="3">

  <label for="email">Email</label>
  <input type="email" id="email" name="email" required>

  <label for="age">Age</label>
  <input type="number" id="age" name="age" min="13" max="120" required>

  <button type="submit" id="submit-btn">Sign Up</button>
  <div id="spinner" class="spinner" hidden></div>
  <p id="form-error"></p>
  <p id="form-success"></p>
</form>
```

```js
const form = document.getElementById("signup-form");
const submitBtn = document.getElementById("submit-btn");
const spinner = document.getElementById("spinner");
const errorMsg = document.getElementById("form-error");
const successMsg = document.getElementById("form-success");

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  submitBtn.disabled = true;
  spinner.hidden = false;
  errorMsg.textContent = "";
  successMsg.textContent = "";

  const formData = new FormData(form);
  const values = Object.fromEntries(formData);
  values.age = Number(values.age);

  try {
    const response = await fetch("http://127.0.0.1:8000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const errorData = await response.json();
      const firstError = errorData.detail[0];
      throw new Error(firstError.loc[1] + ": " + firstError.msg);
    }

    const data = await response.json();
    successMsg.textContent = "Welcome, " + data.username + "!";
    form.reset();
  } catch (error) {
    errorMsg.textContent = "Signup failed — " + error.message;
  } finally {
    submitBtn.disabled = false;
    spinner.hidden = true;
  }
});
```

### Code walkthrough — the pieces new to this lesson

**`values.age = Number(values.age);`**
- **This line matters more than it looks.** `FormData`/`Object.fromEntries`
  (Lesson 17) always produces **string** values for every field, regardless
  of the input's `type` — the same "form values are always strings" fact
  from Lesson 2's `parseInt` discussion. Lesson 18's `SignupData.age: int`
  expects an actual JSON number, not a numeric-looking string. Skipping
  this conversion sends `"25"` (a string) where the backend expects `25`
  (a number) — depending on how strictly Pydantic is configured, this can
  either coerce automatically or fail validation; **not relying on
  implicit coercion, and converting explicitly yourself, is the safer
  habit**, directly connecting back to Lesson 2's original lesson about
  input values needing deliberate conversion.

**`if (!response.ok) { const errorData = await response.json(); const firstError = errorData.detail[0]; throw new Error(...); }`**
- Same `response.ok` check from Lesson 6/11 — but now specifically handling
  **FastAPI's validation error shape**. When Pydantic validation fails
  (Lesson 18), FastAPI returns a `422` status with a JSON body shaped like:
  ```json
  { "detail": [ { "loc": ["body", "age"], "msg": "ensure this value is greater than or equal to 13", "type": "..." } ] }
  ```
  `errorData.detail` is an **array** — there can be multiple validation
  failures at once (e.g. both `email` and `age` invalid simultaneously);
  this code deliberately shows only the *first* one, a reasonable
  simplification for a lesson, flagged here as a real simplification rather
  than the only correct approach.
- `firstError.loc[1]` — `loc` (location) is itself an array, typically
  `["body", "field_name"]`; index `1` is the actual field name that failed.
  This is real backend-specific response shape knowledge — **reading a
  new API's actual error format, rather than assuming a generic shape, is
  a real, transferable skill**, not something to memorize as if all APIs
  return identically-shaped errors (they don't).

**`throw new Error(firstError.loc[1] + ": " + firstError.msg);`**
- Manually throwing inside the `try` block, exactly like Lesson 6's
  `QuoteService` — this is what routes a *successful HTTP response with a
  failure status* into the same `catch` block that also handles a
  *genuine network failure* (no connection at all), unifying both error
  paths into one place to display to the user, same pattern as before.

**`const data = await response.json(); successMsg.textContent = "Welcome, " + data.username + "!"; form.reset();`**
- On success, reads Lesson 18's actual response body
  (`{"status": "ok", "username": data.username}`) and displays it.
- `form.reset()` — a built-in native method (new to this lesson) that
  clears every field in the form back to its initial value — the AJAX
  equivalent of what a full page reload would have done automatically
  under native submission, except now done deliberately, only on confirmed
  success, without an actual navigation.

**`spinner.hidden = false;` / `spinner.hidden = true;`**
- `hidden` is a plain boolean HTML/DOM attribute (any element has it) that
  the browser handles natively — setting it `true` applies `display: none`
  automatically, no CSS class needed. Combined with Lesson 16's `.spinner`
  animation CSS, this shows/hides the actual spinning loader built two
  lessons ago, now around a **real** network request's real duration,
  instead of a `setTimeout`-simulated one.

**`submitBtn.disabled = true;` ... `finally { submitBtn.disabled = false; ... }`**
- Same disable-during-request pattern from Lesson 8/11 — the `finally`
  block guarantees both the button and the spinner return to normal
  regardless of success or failure, exactly the same reasoning as those
  earlier lessons.

### What happens

Native HTML validation (Lesson 17) runs first, for free — an empty or
malformed field blocks submission before any JS runs at all. If native
validation passes, `preventDefault()` stops the page reload, the spinner
and disabled button appear, `FormData` collects the values (converting
`age` explicitly), and a real `POST` goes to your actual running FastAPI
server. A validation failure the browser's native rules *couldn't* catch
(nothing in HTML can express "server thinks this username is already
taken," for instance) comes back as a 422 with FastAPI's error shape,
parsed and displayed; success clears the form and shows a welcome message
using data the *server* returned, not just an echo of what was sent.

## 4. Change one thing

```diff
     if (!response.ok) {
       const errorData = await response.json();
       const firstError = errorData.detail[0];
-      throw new Error(firstError.loc[1] + ": " + firstError.msg);
+      const allMessages = errorData.detail.map((e) => e.loc[1] + ": " + e.msg).join(", ");
+      throw new Error(allMessages);
     }
```

**What changed:** showing every validation error at once (via `.map` and
`.join`, both familiar from Lessons 9/10), instead of only the first.
**What did not change:** the `try`/`catch`/`finally` structure, the
`response.ok` check, and everything about the loading state — this change
is entirely contained to how one already-caught error gets formatted into a
message string.
**Worth noticing:** `errorData.detail.map(...)` works specifically because
you already know `detail` is an array — reading and trusting the actual
response shape (rather than assuming) is what made this small, safe
extension possible.

## 5. Trap

Predict, then test: stop your FastAPI server entirely (kill the `uvicorn`
process), then submit the form with fully valid data.

Run it. **The trap: `response.ok` is never even reached** — `fetch` itself
rejects (throws) when it cannot connect to the server at all, distinct from
receiving *any* HTTP response (even an error one). This lands in the same
`catch` block, but `error.message` here will be something like
`"Failed to fetch"` — a generic browser network error, not one of
FastAPI's structured validation messages. **This is the exact same
"two different failure paths funneling into one catch block" trap from
Lesson 6** — worth recognizing as the same underlying issue recurring in a
now fully-real, non-simulated setting: a dead server and a validation
failure both end up as "Signup failed — [something]" to the user, with no
way, as currently written, to tell them apart or react differently.

## 6. Exercise

- **Predict:** If you forgot the `"Content-Type": "application/json"`
  header entirely (but still sent `JSON.stringify(values)` as the body),
  what do you think FastAPI would do with the incoming body — parse it
  correctly anyway, or fail in some way? Test it against your real running
  server to check.
- **Repair:** Distinguish the two failure paths from the Trap section —
  check whether `error instanceof TypeError` (a genuine `fetch` network
  failure typically throws this specific error type) versus your own
  manually-thrown `Error`, and show a different message for "can't reach
  the server" versus "the server rejected your data."
- **Modify:** Add a disabled/loading visual state directly on the `<input>`
  fields themselves (not just the button) while the request is pending —
  using `.disabled = true` on each, matching the button's existing pattern.
- **Trace:** Using your browser's Network tab (not just the console), submit
  a form with an invalid age. Find the actual request payload sent, and the
  actual 422 response body received — confirm they match exactly what this
  lesson's code describes, in your own real environment rather than just
  reading about it.

## What to remember
- `fetch`'s second argument (`method`, `headers`, `body`) is where sending
  data (vs. just requesting it) actually lives — GET-only calls from
  earlier lessons never needed it.
- `JSON.stringify` before sending, `response.json()` after receiving — the
  two mirror-image conversions every JSON-based `fetch` exchange needs.
- Reading a real API's actual error response shape (FastAPI's
  `detail`/`loc`/`msg` structure here) is a genuine, transferable skill —
  don't assume a generic shape without checking.
- A dead/unreachable server and a validation failure both land in the same
  `catch` block by default — distinguishing them (via `instanceof` or
  similar) is a real, worthwhile refinement, not just a lesson exercise.

## What's next
This closes the practical gap-filling arc (Lessons 14-19) — CSS layout,
animation math, loading screens, forms, and a real full-stack connection.
From here, the curriculum moves into Phase E: the math track (trigonometry,
vectors, linear algebra, calculus), all still applied directly to CSS/canvas
motion, starting with Lesson 20's sine/cosine-driven animation.
