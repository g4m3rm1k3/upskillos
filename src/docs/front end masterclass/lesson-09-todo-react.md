# Lesson 9 — The Todo List, Rebuilt in React

## What you'll learn
- What React actually is: a library for describing UI as a function of state, not a new language
- JSX — what it really compiles to, and why it looks like HTML but isn't
- Components as functions, and `useState` as the direct replacement for Lesson 8's manual "mutate state, then call render()" pattern
- Props — how a parent passes data down to a child component
- The `key` prop, and why React specifically needs it for lists (tying directly back to Lesson 3)

## What you'll build
Lesson 3's todo list, rebuilt feature-for-feature in React: add, toggle done,
delete — same behavior, deliberately, so the *only* thing that's new is the
mechanism.

## The question
Lesson 8 ended with a very deliberate discipline: state lives in one place,
a `render()` function reads it to produce DOM output, and you had to
remember to call `render()` by hand after every single state change. What if
a library called that `render()` function *for you*, automatically, every
time state changed — and also handled the "clear and rebuild" DOM work
efficiently instead of you writing `innerHTML = ""` yourself? That is,
almost exactly, what React does.

## 1. Predict

In Lesson 8, `render()` was a function you wrote and called manually. If
React calls something equivalent to `render()` for you automatically,
predict: what does React need to know in order to know *when* to call it?
(Hint: think about what triggered every `render()` call in Lesson 8 — was it
ever called for no reason, or always right after something specific?)

## 2. Try it

This lesson uses a single HTML file with React loaded from a CDN and JSX
compiled in-browser by Babel — the simplest possible React setup, good for
learning, though real projects use a build tool (out of scope for now).

**`src/lesson-09-todo-react/index.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Todo List — React</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">

    function App() {
      const [count, setCount] = React.useState(0);

      return (
        <div>
          <p>Clicked {count} times</p>
          <button onClick={() => setCount(count + 1)}>Click me</button>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<App />);

  </script>
</body>
</html>
```

Run this first — this small counter (deliberately echoing Lesson 1) is where
every new concept below gets explained, before the full todo list.

### What this code does

**`<script type="text/babel">`**
- Ordinary `<script>` tags run as plain JavaScript, which cannot parse the
  `<div>...</div>`-looking syntax below — that syntax is **JSX**, not valid
  JavaScript on its own. `type="text/babel"` tells the Babel library (loaded
  above) to intercept this script, transform the JSX into plain JavaScript
  function calls, and *then* run it. This in-browser compilation step is
  convenient for learning but slow for production — real projects run this
  transformation ahead of time, during a build step, not in the browser on
  every page load.

**`function App() { ... }`**
- A React **component** is, at its core, just a JavaScript function. There
  is no special `component` keyword — the only conventions are: its name is
  capitalized (`App`, not `app` — React uses this capitalization to
  distinguish your components from plain HTML tags in JSX), and it returns
  something describing UI.

**`const [count, setCount] = React.useState(0);`**
- `React.useState(0)` is a **hook** — a special React function, callable
  only from directly inside a component function body. It returns an array
  with exactly two elements: the *current* state value, and a function to
  *update* it. `0` is the initial value, used only the very first time this
  component renders.
- `const [count, setCount] = ...` — **array destructuring** (sibling to
  Lesson 8's object destructuring): pulls the array's first element into
  `count`, second into `setCount`, by position, not by name — you could
  legally name these anything (`const [x, y] = React.useState(0)`), but
  `[value, setValue]` naming is universal convention.
- **This single line replaces almost everything `WeatherState`'s constructor
  and manual property assignments did in Lesson 8.** `count` is the state
  value (was `this.someProperty`); `setCount` is how you change it (was
  `state.someMethod(...)`, but generic — one `useState` call, one dedicated
  setter, rather than custom methods you write yourself per state shape).

**`return ( <div> ... </div> );`**
- What a component **returns** describes what should appear on screen —
  this is JSX. It is *not* a string of HTML, and it's not the actual DOM.
  Under the hood, Babel transforms
  ```jsx
  <div><p>Clicked {count} times</p></div>
  ```
  into plain JavaScript function calls, roughly:
  ```js
  React.createElement("div", null,
    React.createElement("p", null, "Clicked ", count, " times")
  );
  ```
  **This is the single most important fact about JSX to internalize**: it is
  syntax sugar for nested function calls building a plain JavaScript object
  tree (a "React element" tree) describing what you *want* on screen. React
  itself later compares this description to what's currently on screen and
  decides what DOM operations are actually needed — this comparison-and-sync
  step is what replaces your Lesson 3/8 manual `innerHTML = ""` rebuilding.

**`{count}`** (inside the JSX)
- Curly braces inside JSX **embed a JavaScript expression** directly into
  the output — `{count}` inserts the current value of the `count` variable
  as text. Only *expressions* are allowed here (things that produce a
  value) — not statements like `if` or `for` directly (there are JSX-idiomatic
  ways to handle conditionals and loops, which the todo list below
  demonstrates).

**`<button onClick={() => setCount(count + 1)}>`**
- `onClick` is JSX's version of `addEventListener("click", ...)` — but
  written as a JSX **attribute** rather than a separate
  `.addEventListener` call. React attaches the actual DOM listener for you
  once, under the hood.
- `{() => setCount(count + 1)}` — an arrow function (Lesson 7), passed as
  the value of `onClick`, following the exact same "pass the function
  itself, not its result" rule from Lesson 4's `setInterval(spawnTarget,
  ...)`. Writing `onClick={setCount(count + 1)}` (without the arrow wrapper)
  would call `setCount` **immediately during render**, not on click — a
  direct echo of the "forgot to omit the parentheses" trap from Lesson 4.
- `setCount(count + 1)` — calling the setter with a new value. **This is the
  crucial new behavior**: calling `setCount` doesn't just store a new number
  somewhere — it tells React "this component's state changed," which
  triggers React to call `App()` again from scratch, producing a new JSX
  tree with the new `count` value baked in, which React then efficiently
  syncs to the real DOM. **You never called anything resembling `render()`
  yourself here** — this is the direct answer to your Predict question:
  React calls the equivalent of `render()` automatically, specifically and
  only in response to a `useState` setter being called.

**`ReactDOM.createRoot(document.getElementById("root")).render(<App />);`**
- `document.getElementById("root")` — exactly the same DOM method from
  Lesson 1, finding the one real `<div id="root">` in the actual page.
  React needs exactly one real DOM element to "mount" into — everything
  *inside* that element from here on is managed by React, not by you
  directly.
- `<App />` — JSX for "create one instance of the `App` component," directly
  parallel to Lesson 5's `new Paddle(20, 150)`: a blueprint (`App`, or
  `Paddle`) being instantiated into something real (one rendered component,
  or one paddle object). The self-closing `/>` is JSX syntax for a component
  with no children inside it.
- `.render(...)` — the one-time call that starts everything, comparable to
  Lesson 5's final `requestAnimationFrame(gameLoop);` kickoff line: after
  this, React takes over calling `App()` again on its own, every time state
  changes, without you calling anything further yourself.

## 3. Why?

### Mental model

```
setCount(newValue) called (inside an event handler)
   ↓
React marks App's state as changed
   ↓
React calls App() again, from scratch, top to bottom
   ↓
App() returns a NEW JSX tree (built via React.createElement calls)
   ↓
React compares the new tree to what's currently on screen
   ↓
React updates ONLY the real DOM nodes that actually differ
   ↓
screen reflects new state — automatically, no render() call from you
```

Compare directly to Lesson 8's:
```
state.someMethod(...) called
   ↓
YOU must remember to call render()
   ↓
render() manually reads state and rewrites the relevant DOM
```

The state-changes-then-something-reads-it-to-update-the-DOM shape is
identical. What's different is *who* calls the reading step, and *how
efficiently* the DOM gets updated — not the underlying idea.

## 4. Change one thing

```diff
     function App() {
       const [count, setCount] = React.useState(0);

       return (
         <div>
           <p>Clicked {count} times</p>
-          <button onClick={() => setCount(count + 1)}>Click me</button>
+          <button onClick={() => setCount(count + 5)}>Click me</button>
         </div>
       );
     }
```

**What changed:** the increment amount — directly mirroring Lesson 1's
"change one thing" exercise, on purpose.
**What did not change:** nothing about `useState`, JSX structure, or the
mounting code needed to change. Notice this proves the same point Lesson
1's version did: the "what changed the data" line and "what displays the
data" concern (`{count}`) are decoupled — except here, you didn't need a
separate line to sync them at all. React's re-render handles that
automatically, every time.

## 5. Put it in the project — the full todo list

```jsx
function TodoApp() {
  const [todos, setTodos] = React.useState([]);
  const [inputValue, setInputValue] = React.useState("");

  function addTodo() {
    const text = inputValue.trim();
    if (text === "") return;

    setTodos([...todos, { text: text, done: false }]);
    setInputValue("");
  }

  function toggleTodo(index) {
    const updated = todos.map((todo, i) => {
      if (i === index) {
        return { ...todo, done: !todo.done };
      }
      return todo;
    });
    setTodos(updated);
  }

  function deleteTodo(index) {
    const updated = todos.filter((todo, i) => i !== index);
    setTodos(updated);
  }

  return (
    <div>
      <h1>Todo List</h1>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map((todo, index) => (
          <TodoItem
            key={index}
            todo={todo}
            onToggle={() => toggleTodo(index)}
            onDelete={() => deleteTodo(index)}
          />
        ))}
      </ul>
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li
      onClick={onToggle}
      style={{ textDecoration: todo.done ? "line-through" : "none" }}
    >
      {todo.text}
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        Delete
      </button>
    </li>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<TodoApp />);
```

### Code walkthrough — new pieces beyond the counter

**`const [todos, setTodos] = React.useState([]);`**
- Same `useState` pattern, this time initialized to an empty array — this is
  the direct React replacement for Lesson 3's `let todos = [];`, and for
  Lesson 8's `this.history` array on a class instance.

**`setTodos([...todos, { text: text, done: false }]);`**
- `[...todos, newItem]` — the **spread operator** (`...`). This creates a
  **brand new array** containing every element of `todos`, followed by the
  new item — it does **not** modify `todos` in place. Compare directly to
  Lesson 3's `todos.push(...)`, which *did* mutate the array directly.
- **Why does React require a new array instead of mutating the existing
  one?** React decides whether to re-render partly by checking whether the
  state value *reference* changed (a cheap check: is this the same array
  object in memory, or a different one?). If you called `todos.push(...)`
  directly, `todos` would still be the *same* array object afterward — just
  with different contents — and React might not detect that anything
  changed at all, silently failing to re-render. This is a real, extremely
  common React bug for developers coming from vanilla JS array habits; the
  spread operator is how you avoid it, by always producing a genuinely new
  array/object for `useState` setters.

**`todos.map((todo, i) => { if (i === index) { return { ...todo, done: !todo.done }; } return todo; })`**
- `.map(...)` — an array method (new to this lesson, sibling to `.forEach`,
  `.filter`, `.some` you already know) that returns a **new array**, built
  by transforming every element through the callback. Here: for the matching
  index, return a *new* todo object with `done` flipped; for every other
  index, return the *same* object unchanged (no need to copy what didn't
  change).
- `{ ...todo, done: !todo.done }` — spreading an *object* this time (not an
  array): copies every property from `todo` into a new object, then
  `done: !todo.done` **overwrites** just that one property on the new
  object, right after the spread. Property order matters here: writing
  `{ done: !todo.done, ...todo }` instead would have the spread's own
  `done` value overwrite your flipped one, undoing the change — worth
  testing deliberately if this feels unintuitive.
- **This entire function is the React-idiomatic replacement for Lesson 3's**
  `todos[index].done = !todos[index].done;` — direct, in-place mutation.
  React code consistently favors "build a new version, don't mutate the old
  one," for the exact reference-checking reason explained above.

**`todos.filter((todo, i) => i !== index)`**
- `.filter(...)` returns a new array containing only elements where the
  callback returns `true` — here, every todo *except* the one at the
  deleted index. This replaces Lesson 3's `todos.splice(index, 1);`, again
  favoring "build a new array without the item" over "mutate the array to
  remove the item."

**`<input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />`**
- This is a **controlled input** — a genuinely new idea, not present in
  Phases A/B. The input's displayed text (`value={inputValue}`) is driven
  *entirely* by React state, not by the browser's own internal input state.
  Every keystroke fires `onChange`, which reads `e.target.value` (the DOM
  input's raw current text — same `.value` property from Lesson 2) and
  immediately calls `setInputValue` to update React's state to match.
- **Why go through this loop instead of just letting the browser manage the
  input's text itself, and reading `input.value` only when Add is clicked
  (Lesson 3's approach)?** Because now `inputValue` is a piece of state
  React knows about at all times — enabling things like disabling the Add
  button while empty, live character counts, or clearing the field via
  `setInputValue("")` after adding (used right here) without ever touching
  the DOM directly yourself.

**`function TodoItem({ todo, onToggle, onDelete }) { ... }`**
- A **second component** — this app is no longer one function, but two,
  composed together. `TodoItem` is a smaller, focused piece responsible only
  for rendering one todo.
- `{ todo, onToggle, onDelete }` — **object destructuring directly in the
  function's parameter list** (a variation of Lesson 8's destructuring
  syntax). `TodoItem` receives exactly one argument — an object — and this
  syntax immediately unpacks `todo`, `onToggle`, and `onDelete` from it as
  three separate local names, rather than writing `props.todo`,
  `props.onToggle`, `props.onDelete` throughout the function body.

**`<TodoItem key={index} todo={todo} onToggle={...} onDelete={...} />`** (inside
`TodoApp`'s `.map`)
- This is calling `TodoItem` as a component, passing it **props** — data
  handed down from parent (`TodoApp`) to child (`TodoItem`). `todo={todo}`,
  `onToggle={...}`, `onDelete={...}` are three separate props, each becoming
  one property on the single object `TodoItem` receives and destructures.
- **`onToggle={() => toggleTodo(index)}`** — passing a function *down* as a
  prop, specifically one that already "knows" which `index` it's for (via
  closure, same concept from Lesson 1's callback remembering `count`).
  `TodoItem` itself never needs to know about indices at all — it just calls
  whatever `onToggle` function it was handed, without knowing or caring what
  that function actually does. This is **inversion of control**: the parent
  decides *what* happens, the child only decides *when* (on click).

**`key={index}`**
- **This is the direct payoff of your Predict question from Lesson 3's
  trap section**, revisited here explicitly. When React re-renders a list
  produced by `.map()`, it needs a way to tell *which* rendered item
  corresponds to *which* array element across re-renders — otherwise, if
  you delete the second todo out of five, React can't tell whether item #3
  moved into #2's slot, or whether #2 itself was actually removed, without
  some stable identifier. `key` provides exactly that identifier. **Using
  the array index as `key` works for this simple app, but is a known
  React anti-pattern once list order can change or items can be inserted in
  the middle** — a stable, unique id per todo (not its position) is the
  more correct long-term choice, flagged here as a real caveat rather than a
  detail to gloss over.

**`e.stopPropagation()`** (inside the delete button's `onClick`)
- Recall Lesson 3's event delegation: a click bubbles from the clicked
  element up through its ancestors. Here, the delete `<button>` is nested
  inside the `<li>`, and the `<li>` itself has its own `onClick={onToggle}`.
  Without `stopPropagation()`, clicking Delete would *also* trigger the
  `<li>`'s toggle handler as the click bubbles upward — toggling a todo
  that's about to be deleted anyway. `.stopPropagation()` halts the bubbling
  at the button, so only `onDelete` fires, not both.

### What happens

Typing updates `inputValue` on every keystroke (controlled input); clicking
Add builds a new todos array via spread and clears the input; clicking a
todo's text toggles it via `.map` producing a new array with one item
changed; clicking Delete removes it via `.filter` producing a new array
without that item. Every single one of these calls a `useState` setter,
which is the *only* thing that ever triggers React to re-render — you never
call anything like `render()` yourself, anywhere in this file.

## 6. Trap

Predict, then test: change `toggleTodo` to mutate directly instead of using
`.map`:

```js
function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  setTodos(todos);
}
```

Run it, click a todo. **The trap: nothing visibly breaks in an obviously
wrong way — the underlying data genuinely does change (`todos[index].done`
really is flipped) — but the strikethrough style may not update, or may
update inconsistently.** This is exactly the reference-equality problem
explained above: `setTodos(todos)` passes the *same* array reference React
already had, so React may conclude nothing changed and skip re-rendering
that part of the UI, even though the data underneath genuinely did change.
This is one of the most common real-world React bugs, and it's silent — no
error, no warning by default, just UI that quietly stops reflecting reality.

## 7. Exercise

Pick at least one:

- **Repair:** the trap above is already "fixed" in the lesson's main version
  — but explain, in your own words, precisely *why* `{ ...todo, done:
  !todo.done }` avoids the problem while direct mutation doesn't. Say it out
  loud or write it down before moving on.
- **Predict:** If two `TodoItem`s ended up with the *same* `key` value (a
  bug), what problems might you expect when toggling or deleting one of
  them? (You don't need to reproduce this — reasoning about it is the
  exercise.)
- **Modify:** Add an "items remaining" count below the list using `.filter`
  on `todos` — directly comparable to Lesson 3's equivalent exercise, now in
  React.
- **Compare:** Open Lesson 3's `script.js` and this lesson's `script.js`
  side by side. For each of: adding a todo, toggling one, deleting one — is
  the *underlying idea* (what conceptually needs to happen) the same or
  different between the two versions? What's genuinely new here, versus
  what's just a different way of writing the same idea?

## What to remember
- A React component is a function returning JSX; JSX compiles to
  `React.createElement(...)` calls building a plain JS description of UI,
  not real DOM directly.
- `useState` returns `[value, setter]`; calling the setter is what triggers
  React to re-render — this fully replaces manually calling `render()`
  yourself.
- React state updates must produce **new** arrays/objects (via spread,
  `.map`, `.filter`) rather than mutating existing ones in place, or React
  may fail to detect the change.
- `key` on list items lets React track identity across re-renders — array
  index works for now, but is a known limitation once list order can
  change.
- Props pass data (including functions) from parent to child components,
  one direction only — the child never reaches back up to modify the
  parent's state directly.

## Next lesson
Lesson 10 is Tic-Tac-Toe — a smaller game than Snake or Pong, deliberately,
so the lesson can focus entirely on **lifting state up**: multiple sibling
components (nine squares) that all need to share and agree on one piece of
state (whose turn it is, the board), owned by their common parent rather than
duplicated across them.
