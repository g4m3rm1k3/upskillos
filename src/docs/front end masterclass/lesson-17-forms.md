# Lesson 17 — Forms, For Real

## What you'll learn
- Why a `<form>` reloads the page by default, and what it's actually doing when it does
- Input types beyond plain text, and the free validation each one gives you
- Built-in validation attributes (`required`, `pattern`, `min`/`max`) and the `:valid`/`:invalid` pseudo-classes
- `FormData` — reading an entire form's values at once, without querying each input individually

## What you'll build
A signup form (name, email, age, password) with real native validation and
visible valid/invalid styling — no JavaScript validation logic yet, all of
it native to the `<form>` element itself.

## The question
Every input you've used in this series so far (Lessons 2, 3, 9, 11) was a
single `<input>`, read manually via `.value` inside a click handler. A real
form usually has *several* related inputs, submitted together, and browsers
have had built-in submission behavior since before JavaScript existed at
all. What does a `<form>` actually do the moment you click a `type="submit"`
button inside it, if you write no JavaScript at all?

## 1. Predict

Before testing anything: write a plain `<form>` with one `<input>` and a
submit button, with zero JavaScript. Predict what happens to the page the
moment you click submit — does anything visibly happen at all, and if so,
what?

## 2. Try it

```html
<form>
  <input type="text" name="username">
  <button type="submit">Submit</button>
</form>
```

Open your browser's dev tools Network tab, then submit this form (type
anything, click Submit).

### What this code does

**`<form>` with no `action` or `method` attribute**
- The browser's **default behavior**, unrelated to any JavaScript you write:
  submitting a form sends an HTTP request and — critically — **reloads the
  page**. With no `action` specified, it submits to the *current* URL; with
  no `method` specified, it defaults to a **GET** request, appending the
  form's data as URL query parameters (you'd see this in the address bar
  after submitting: `?username=whatever-you-typed`).
- **This is the direct answer to your Predict question**, and it's the
  single most important fact this lesson establishes: **forms have always
  had working submission behavior, entirely without JavaScript** — this
  predates AJAX, predates `fetch`, predates even the earliest JavaScript.
  Every "form doesn't submit right" bug you'll ever debug in a
  JavaScript-heavy app almost always traces back to this default behavior
  firing when you didn't want it to (explored directly in the Trap
  section).

**`<button type="submit">`**
- `type="submit"` (the default for a `<button>` inside a `<form>`, even if
  omitted) is specifically what triggers this native submission when
  clicked. A `<button type="button">` inside the same form would do nothing
  on its own — worth knowing precisely, since "my button submits the form
  when I didn't want it to" is an extremely common bug caused by forgetting
  this default.

## 3. Why — input types and built-in validation

```html
<form>
  <label for="email">Email</label>
  <input type="email" id="email" name="email" required>

  <label for="age">Age</label>
  <input type="number" id="age" name="age" min="13" max="120" required>

  <label for="password">Password</label>
  <input type="password" id="password" name="password"
         pattern=".{8,}" title="At least 8 characters" required>

  <button type="submit">Sign Up</button>
</form>
```

**`<label for="email">` paired with `<input id="email">`**
- `for` matches the input's `id` — this is what makes clicking the *label
  text itself* focus the associated input, and (importantly for
  accessibility, briefly, since it's a genuinely free win here) is what
  screen readers use to announce which label belongs to which field. This
  connection is established purely through matching string values — no
  JavaScript, no nesting requirement.

**`type="email"`**
- Beyond just being a text input, `type="email"` gives you **free,
  built-in validation**: the browser checks for a basic valid-email shape
  (something@something) before allowing submission, with zero code from
  you. On mobile devices, it also typically shows an email-optimized
  on-screen keyboard (with `@` easily accessible) — a real, practical
  benefit of choosing the correct `type` rather than always defaulting to
  `type="text"`.

**`type="number"` with `min="13" max="120"`**
- Restricts input to numeric values, and `min`/`max` add range validation —
  the browser will flag a submitted age of `5` or `200` as invalid without
  any JavaScript, since both fall outside the declared range.

**`pattern=".{8,}"`**
- A **regular expression** (regex) the input's value must match to be
  considered valid. `.{8,}` means "any character, at least 8 times" — i.e.
  at least 8 characters of any kind. Regex syntax is a large topic beyond
  this lesson's scope, but recognizing `pattern` as accepting a regex, and
  reading a simple one like this, is a genuinely useful skill on its own.
- `title="At least 8 characters"` — the browser shows this text as part of
  its native validation error message when the pattern doesn't match,
  giving the user an actual explanation rather than a generic "invalid"
  message.

**`required`** (on all three inputs)
- A **boolean attribute** — its mere presence means "must have a value,"
  regardless of what value you'd assign it (`required=""`, `required`, and
  `required="required"` are all equivalent). Submission is blocked
  natively if any `required` field is empty.

### The `:valid` / `:invalid` pseudo-classes

```css
input:invalid {
  border-color: crimson;
}
input:valid {
  border-color: seagreen;
}
input:placeholder-shown {
  border-color: #ccc;
}
```

**`input:invalid` / `input:valid`**
- CSS pseudo-classes (same family as `:hover` from Lesson 15) that match
  automatically based on the browser's own native validation state — no
  JavaScript required to know or track whether a field is currently valid.
  As soon as a `type="email"` field contains something that isn't a valid
  email shape, `:invalid` applies and this CSS takes effect immediately.

**`input:placeholder-shown`**
- Matches only while the input is empty and showing its placeholder text —
  used here to avoid showing red "invalid" borders on empty, untouched
  fields the instant the page loads (an empty `required` field is
  technically "invalid" natively, which would otherwise color every field
  red before the user has even started typing — a real, common UX mistake
  this rule specifically avoids).

## 4. Change one thing

```diff
   <input type="number" id="age" name="age" min="13" max="120" required>
+  <span class="hint">Must be between 13 and 120</span>
```

**What changed:** a plain hint text added, no functional change to
validation itself.
**What did not change:** the `min`/`max` validation behavior — it was
already fully enforced natively before this line existed.
**Worth noticing:** native validation doesn't automatically display
*helpful* messages — it shows a generic browser-default tooltip (styling
and wording of which varies by browser and can't be fully controlled with
plain HTML/CSS). Explicit hint text like this, and the `title` attribute
from `pattern` above, are both ways of improving on that generic default
without writing any JavaScript.

## 5. Put it in the project

```html
<form id="signup-form">
  <label for="username">Username</label>
  <input type="text" id="username" name="username" required minlength="3">

  <label for="email">Email</label>
  <input type="email" id="email" name="email" required>

  <button type="submit">Sign Up</button>
</form>
```

```js
const form = document.getElementById("signup-form");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const formData = new FormData(form);
  const values = Object.fromEntries(formData);

  console.log(values);
});
```

### Code walkthrough

**`form.addEventListener("submit", function (event) { ... })`**
- The `"submit"` event — a new event type, distinct from `"click"` — fires
  when the form is submitted, whether by clicking a `type="submit"` button
  *or* by pressing Enter inside any of the form's text inputs (a native
  browser behavior worth knowing, since it means "submit" isn't only
  triggered by clicking the button).

**`event.preventDefault();`**
- **This is the single most important line in this lesson.** It stops the
  browser's native submission behavior from Step 2 — no page reload, no
  navigation, nothing. Without this line, everything below it would still
  run, but the page would reload immediately afterward anyway, wiping out
  any visible result before you could see it (a very common early-React/JS
  bug: "my form handler runs but the page just refreshes").
- **Note this only runs, and only prevents default, if native validation
  already passed.** If any `required`/`pattern`/`type="email"` field is
  currently invalid, the browser blocks submission *before* the `"submit"`
  event even fires — meaning your JavaScript here never runs at all for an
  invalid form. Native validation and your own `submit` handler are two
  separate layers, and native validation runs first, for free.

**`new FormData(form)`**
- `FormData` is a built-in browser object that reads **every named input
  inside the form at once**, keyed by each input's `name` attribute (not
  `id` — worth noting this is a different attribute than what `<label
  for="...">` matched against). This replaces manually calling
  `.value` on each individual input separately, the way Lessons 2/3 did one
  at a time.

**`Object.fromEntries(formData)`**
- `FormData` itself isn't a plain object — it's iterable in a
  key-value-pairs shape. `Object.fromEntries(...)` converts that into an
  ordinary `{ username: "...", email: "..." }` object, which is generally
  more convenient to work with (e.g. to pass directly into a `fetch` body,
  which Lesson 18 does next).

### What happens

Typing into the fields triggers native validation continuously (driving the
`:valid`/`:invalid` CSS from Step 3 live, as you type). Clicking Submit (or
pressing Enter) first goes through native validation — if anything's
invalid, the browser blocks submission and shows its own native message,
and your JS never runs. If everything's valid, the `"submit"` event fires,
your handler runs, `preventDefault()` stops the reload, and `FormData`
collects every field's current value into one object, logged to the
console instead of causing a page navigation.

## 6. Trap

Predict, then test: remove `event.preventDefault();` from the handler, keep
everything else, and submit a fully valid form.

Run it. **The trap: `console.log(values)` still runs — you'll see it flash
in the console for an instant — but the page immediately reloads right
after, because nothing stopped the native submission behavior from Step 2.**
This is worth experiencing directly rather than just reading about: your
JavaScript handler and the browser's native submission aren't mutually
exclusive — both run, in order, unless you explicitly cancel the native one.
This exact trap — forgetting `preventDefault()` and wondering why a form
handler "doesn't work" when it actually ran and then got wiped out by a
reload — is one of the most common beginner form bugs across any JS
framework, not unique to plain JavaScript.

## 7. Exercise

- **Predict:** If `<input type="email">` were changed to
  `<input type="text">` (keeping `required`), would the browser still
  reject `"not-an-email"` as a value on submit? Why or why not?
- **Modify:** Add a `confirm password` field, and inside the `submit`
  handler (after `preventDefault()`), check the two password values match
  before logging — this is validation *your* code does, beyond what native
  HTML validation alone can express (native validation can't compare two
  separate fields' values to each other).
- **Break:** Remove `required` from the email field only. Submit with it
  empty. Does the form still submit? What does `values.email` equal in the
  console?
- **Trace:** Write out, step by step, the full sequence of what happens —
  including which parts are native browser behavior and which are your own
  JS — between pressing Enter inside the username field (not clicking the
  button at all) and `values` appearing in the console.

## What to remember
- Forms have working native submission (page reload, GET request) with
  zero JavaScript — this predates JS entirely, and it's still exactly what
  happens unless you call `event.preventDefault()`.
- Choosing the correct `type` (`email`, `number`, etc.) gives you free
  validation and better mobile keyboards, not just different-looking boxes.
- `required`/`pattern`/`min`/`max` are native validation, enforced by the
  browser *before* your `submit` handler ever runs for an invalid form.
- `FormData` + `Object.fromEntries` reads every named field at once,
  replacing manual `.value` reads per input.

## Next lesson
Lesson 18 takes this exact form and submits it via `fetch` instead of
letting the browser navigate anywhere — combining `preventDefault()`,
`FormData`, Lesson 6/11's `async`/`await` and error handling, and Lesson
16's loading screen into one complete, real AJAX form flow.
