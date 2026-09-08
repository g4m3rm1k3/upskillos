# Lesson 1 — The Click Counter

## What you'll learn
- How JavaScript reaches into a web page and grabs a specific element
- How an event listener actually works (not just "it runs when clicked")
- The core frontend loop: **state changes → you update the DOM to match**
- Why that loop is the seed of everything React later automates for you

## What you'll build
A button that counts how many times it's been clicked, in plain HTML/CSS/JS.
Trivial on purpose — the point is to see every moving part clearly before we
add complexity in later lessons.

## The question
When you click a button on a webpage and a number on screen goes up, what is
*actually* happening between your mouse click and the pixels changing?

## 1. Predict

Before writing anything: a webpage is just HTML sitting in memory as a tree of
objects (the DOM — Document Object Model). Given that, what do you think
JavaScript needs to do, in order, to (a) notice a click happened and (b)
change what's on screen?

Write down a guess — even a rough one — before continuing.

## 2. Try it

Create three files in `src/lesson-01-click-counter/`:

**`index.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Click Counter</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <button id="counter-btn">Clicked 0 times</button>
  <script src="script.js"></script>
</body>
</html>
```

**`style.css`**
```css
button {
  font-size: 1.5rem;
  padding: 1rem 2rem;
  cursor: pointer;
}
```

**`script.js`**
```js
const button = document.getElementById("counter-btn");

let count = 0;

button.addEventListener("click", function () {
  count = count + 1;
  button.textContent = "Clicked " + count + " times";
});
```

### What this code does

Go construct by construct — this is the part most tutorials skip and it's
exactly the part that matters.

**`document.getElementById("counter-btn")`**
- `document` is a global object the browser gives every page automatically. It
  is the JavaScript representation of the DOM tree — every HTML element you
  wrote becomes a node in this tree the moment the browser parses your HTML.
- `.getElementById(...)` is a *method* on `document`. It walks that tree
  looking for exactly one element whose `id` attribute matches the string you
  pass in.
- `"counter-btn"` — a string literal. It must match the `id="counter-btn"` in
  your HTML *exactly*, including case. There's no fuzzy matching.
- **Return value**: the actual DOM element object (or `null` if nothing
  matches — a common source of bugs later, worth remembering now).
- **Why this form and not an alternative?** There's also
  `document.querySelector("#counter-btn")`, which does the same thing here but
  can also match by class or tag. `getElementById` is used here because it's
  the most direct — one specific element, one specific lookup mechanism.

**`const button = ...`**
- `const` declares a variable that cannot be *reassigned* — you can't later
  write `button = something else`. This is a deliberate choice: the button
  element itself never changes, only things about it (like its text) change.
  `const` documents that intent.
- **What if it were `let`?** It would still work — nothing here reassigns
  `button`. But `const` is more honest about what actually happens, and
  catches you if you accidentally try to reassign it later.

**`let count = 0;`**
- `let` (not `const`) — because this variable's whole job is to change.
- This is your **state**. That word matters — you'll see it constantly from
  here through React. State is "the data that determines what's currently on
  screen." Right now, the entire state of this app is one number.
- `0` — the initial value, chosen because the button starts saying "Clicked 0
  times," and this variable and that text need to agree with each other from
  the start.

**`button.addEventListener("click", function () { ... })`**
- `.addEventListener` is a method every DOM element has. It does **not** run
  anything immediately — it registers a instruction with the browser: "when
  this specific kind of event happens on this specific element, call this
  function."
- `"click"` — the event type as a string. The browser defines a fixed set of
  these (`"click"`, `"mouseover"`, `"keydown"`, and many more). You're
  subscribing to exactly one.
- `function () { ... }` — this is a **callback**: a function you hand to
  something else, which calls it for you later, at a time you don't control.
  You never call this function yourself anywhere in your code — the browser
  calls it, once per click, whenever the click happens.
- **Runtime behavior**: nothing inside this function body runs when the page
  loads. `addEventListener` just files the function away. It only executes
  later, asynchronously, in response to a real click.
- **What if you removed `addEventListener` and just wrote the two lines of
  code directly in `script.js`?** They'd run once, immediately, when the page
  loads — not on click. This is the single most important distinction in this
  lesson: *registering* behavior vs. *running* it now.

**`count = count + 1;`**
- No `let` or `const` here — this is a **reassignment**, not a new
  declaration. It's only legal because `count` was declared with `let`
  earlier, in an outer scope this function can "see into" (this is called a
  **closure** — the callback function keeps access to variables from where it
  was defined, even though it runs later and elsewhere).
- Reads the current value of `count`, adds `1`, stores the result back into
  `count`. Ordinary arithmetic — nothing DOM-specific happens on this line.

**`button.textContent = "Clicked " + count + " times";`**
- `.textContent` is a **property** on the button element, not a method — no
  parentheses. Setting it replaces everything inside the `<button>` tag with
  the given text.
- `"Clicked " + count + " times"` — string concatenation. `count` is a
  number; `+` between a string and a number converts the number to a string
  first, then joins them.
- **This is the second half of the loop**: line 1 changed the *data*
  (`count`), this line changes what the *screen* shows to match it. Nothing
  connects these two automatically — you write the sync by hand, every time.
  Remember this; it's exactly the chore React exists to eliminate.

### What happens

Load `index.html` in a browser. Click the button. Each click:
1. The browser detects a `click` event on the `<button>` element.
2. It looks up whether any listeners are registered for `"click"` on that
   element — finds the one you registered.
3. Calls your callback function.
4. `count` increments by 1 in memory.
5. `button.textContent` is reassigned, which the browser immediately
   re-renders on screen.

## 3. Why?

### Mental model

```
User click
   ↓
Browser fires a "click" event on the button element
   ↓
Your registered callback runs
   ↓
Callback updates JS state (count)
   ↓
Callback manually updates the DOM (textContent) to match
   ↓
Browser repaints the pixel
```

Two arrows in the middle are doing separate jobs: **updating data**, and
**updating what's displayed**. In this lesson you write both, by hand, in the
same function. Keep this pair in mind — it's the exact seam React will later
insert itself into.

## 4. Change one thing

```diff
 button.addEventListener("click", function () {
-  count = count + 1;
+  count = count + 5;
   button.textContent = "Clicked " + count + " times";
 });
```

**What changed:** the increment amount, from `1` to `5`.
**What did not change:** the event registration, the callback's shape, and
the line that syncs `count` to `textContent`. That sync line has no idea
*how much* `count` changed — it just re-reads whatever `count` currently is.
This is worth noticing: the "update the display" line is completely decoupled
from the "what changed the data" line, as long as it runs *after* it.

## 5. Put it in the project

This exact pattern — a piece of state plus a hand-written line that keeps the
DOM in sync with it — is the pattern every vanilla-JS app in this series uses
before we get to React in Phase C. Lesson 3's todo list is this same loop,
just with an array instead of a number, and a loop that rebuilds several DOM
elements instead of one line of text.

## 6. Trap

Try this modification:

```js
button.addEventListener("click", function () {
  count = count + 1;
});
```

(Removed the `textContent` line entirely.)

**Predict** what happens before you run it, then run it.

You'll find `count` is genuinely incrementing — add
`console.log(count)` inside the callback to confirm — but the button text
never changes. This is the trap: **JavaScript state and the DOM are two
separate things that do not sync automatically.** Changing a variable never
changes what's on screen by itself. Every visual update is a line of code you
write, or a framework writing it for you. There is no third option in a
browser.

## 7. Exercise

Pick at least one:

- **Predict:** Without running it, what will the button say after 3 clicks if
  you initialize `let count = 10;` instead of `0`, but leave the HTML saying
  "Clicked 0 times"?
- **Break:** Change `addEventListener("click", ...)` to
  `addEventListener("mouseover", ...)`. What user action now triggers the
  counter? Does clicking still do anything?
- **Modify:** Add a second button that resets `count` back to `0` and updates
  the text accordingly. (Hint: you'll need a second `getElementById` call and
  a second `addEventListener`.)
- **Trace:** Write out, in your own words, the 5-step sequence from "Why?"
  above but for the reset button you just built.

## What to remember
- `document.getElementById` retrieves one real DOM node by its `id`.
- `addEventListener` *registers* a callback; it does not run it immediately.
- State (your variables) and the DOM (what's on screen) are separate and
  never sync automatically — you write that sync yourself.
- `const` vs `let` is a statement of intent: does this variable get
  reassigned or not.

## Next lesson
Lesson 2 keeps this exact same loop but adds conditionals driving different
DOM outcomes (win/lose feedback) and starts organizing repeated code into
named functions instead of one anonymous callback — the first step toward
the classes you'll want by Lesson 5.
