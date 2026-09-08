# Lesson 10 — Tic-Tac-Toe, and Lifting State Up

## What you'll learn
- Why nine independent square components *cannot* each hold their own "am I
  X, O, or empty" state, and what breaks if they try
- **Lifting state up**: state living in the nearest shared parent, passed
  down as props, changed via callback props passed down alongside it
- Derived state — computing the winner *from* existing state, rather than
  storing "who won" as its own separate piece of state
- A second look at immutability, this time with a 2D-ish structure (an array
  representing a board) instead of Lesson 9's array of todos

## What you'll build
Tic-tac-toe: a 3×3 grid, alternating X/O turns, win detection, and a reset
button.

## The question
Lesson 9's `TodoItem` components were independent of each other — toggling
todo #2 has zero effect on todo #4. Tic-tac-toe's squares are *not*
independent: clicking one square needs to know whose turn it is (shared
across all nine squares), and every square needs to know if the game is
already won (also shared). If each `Square` component tried to hold its own
private state for "am I filled," how would you ever implement "whose turn is
it" or "did someone win" using data trapped separately inside nine different
components that can't see each other?

## 1. Predict

You already know, from Lesson 9, that props flow one direction: parent to
child. Predict: if nine `Square` components can't hold the shared game
state themselves, *where* must that state actually live for all nine
squares (and the "whose turn" indicator, and the win-check logic) to have
access to it?

## 2. Try it

Create `src/lesson-10-tic-tac-toe/index.html`, same React+Babel CDN setup as
Lesson 9.

### Building up to it: the wrong way first

```jsx
function Square() {
  const [value, setValue] = React.useState(null);

  return (
    <button onClick={() => setValue("X")}>
      {value}
    </button>
  );
}

function Board() {
  return (
    <div>
      <Square />
      <Square />
      <Square />
    </div>
  );
}
```

### What this code does — and why it's the wrong shape

**`function Square() { const [value, setValue] = React.useState(null); ... }`**
- Each `<Square />` instance gets its **own, completely independent**
  `useState(null)` call. This is a fundamental fact about hooks worth
  stating precisely: `useState` inside a component creates state that
  belongs to *that specific rendered instance* — three `<Square />`
  elements means three entirely separate `value`/`setValue` pairs, with no
  connection between them whatsoever.
- Clicking one square hardcodes `"X"` regardless of whose turn it is,
  because *nothing* tracks turns anywhere — there's no shared place for
  "whose turn" to live. Each square only knows about itself.

**Why this can never grow into a working game:**
- Whose turn is it? No component holds that — each `Square` only knows its
  own value.
- Has anyone won? Checking this requires seeing *all nine* squares' values
  at once — but each square's value is trapped inside that square's own
  private, inaccessible `useState`. `Board` (the parent) has no way to read
  what any individual `Square` currently contains.
- **This is the direct answer to your Predict question, made concrete by
  seeing the broken version first**: since props only flow *downward*
  (parent to child, Lesson 9), and `Board` needs to read and coordinate data
  that currently lives *inside* each `Square`, the state cannot stay where
  it currently is. It must move **up**, to `Board` — the nearest component
  that is a common ancestor of everything that needs access to it.

## 3. Why — the corrected version

```jsx
function Square({ value, onSquareClick }) {
  return (
    <button className="square" onClick={onSquareClick}>
      {value}
    </button>
  );
}

function Board() {
  const [squares, setSquares] = React.useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = React.useState(true);

  function handleClick(i) {
    if (squares[i] || calculateWinner(squares)) return;

    const nextSquares = squares.slice();
    nextSquares[i] = xIsNext ? "X" : "O";
    setSquares(nextSquares);
    setXIsNext(!xIsNext);
  }

  const winner = calculateWinner(squares);
  const status = winner
    ? "Winner: " + winner
    : "Next player: " + (xIsNext ? "X" : "O");

  return (
    <div>
      <p>{status}</p>
      <div className="board-row">
        {squares.map((square, i) => (
          <Square key={i} value={square} onSquareClick={() => handleClick(i)} />
        ))}
      </div>
    </div>
  );
}

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Board />);
```

### Code walkthrough

**`function Square({ value, onSquareClick }) { return <button ... onClick={onSquareClick}>{value}</button>; }`**
- `Square` no longer has *any* `useState` — no internal state at all. It
  receives everything it needs (`value` to display, `onSquareClick` to call)
  as props, and its entire job is: render what it's told to render, and
  call whatever function it's given when clicked. This kind of
  no-internal-state component is sometimes informally called a "presentational"
  or "dumb" component — worth knowing the term, since you'll recognize the
  pattern constantly.
- **This is the corrected shape your Predict question was building toward**:
  `Square` no longer holds state at all; it's `Board` that does.

**`const [squares, setSquares] = React.useState(Array(9).fill(null));`**
- `Array(9)` creates an array with length 9 but **no actual elements yet**
  (technically "empty slots," a subtlety not worth dwelling on) —
  `.fill(null)` then sets every one of those nine slots to `null`
  explicitly. The result: `[null, null, null, null, null, null, null, null,
  null]` — one array, in `Board`, representing all nine squares' values at
  once. This directly answers the "where must shared state live" question:
  right here, one level up from the `Square`s that display it.

**`const [xIsNext, setXIsNext] = React.useState(true);`**
- A second, separate piece of state, also living in `Board` — `true` means
  "X's turn," `false` means "O's turn." Two independent `useState` calls in
  the same component is completely normal — components commonly hold
  several unrelated (or related-but-distinct) pieces of state, each with
  its own hook call.

**`function handleClick(i) { if (squares[i] || calculateWinner(squares)) return; ... }`**
- Defined *inside* `Board`, so it has direct access to `squares`,
  `setSquares`, `xIsNext`, `setXIsNext` via closure (same closure concept
  from Lesson 1, Lesson 9's `onToggle`) — no props needed for a function to
  access its *own* component's state.
- The guard clause: if the clicked square already has a value (`squares[i]`
  is truthy — anything other than `null`/`""`/`0`/`false` counts as truthy
  in a plain `if`), or if the game is already won, do nothing and exit
  early. This prevents overwriting a filled square or playing after the
  game has ended.

**`const nextSquares = squares.slice(); nextSquares[i] = xIsNext ? "X" : "O"; setSquares(nextSquares);`**
- `.slice()` with **no arguments** returns a full shallow copy of the array
  — every element, start to end. This is the same non-mutating instinct
  from Lesson 9 (spread, `.map`, `.filter`), applied via a different method:
  `.slice()` is a common, equally valid way to clone an array before
  changing one element of the copy.
- `nextSquares[i] = xIsNext ? "X" : "O";` — this line *does* directly mutate
  `nextSquares` with ordinary bracket assignment. **This is not a
  contradiction of the immutability rule** — the rule is specifically about
  never mutating the array currently referenced by `useState` (`squares`
  itself); `nextSquares` is a brand-new, separate array that nothing else
  points to yet, so mutating *it*, before handing the finished result to
  `setSquares`, is completely safe and is in fact the standard pattern:
  copy, mutate the copy, then set state to the copy.
- `setSquares(nextSquares)` — hands React the new array; `squares` itself
  (the old one) is never touched.

**`setXIsNext(!xIsNext);`**
- Flips the turn. Two separate state setters called in the same function,
  one after another — both take effect together (React batches these,
  though the mechanics of batching are beyond this lesson's scope; what
  matters here is simply that both updates happen).

**`const winner = calculateWinner(squares); const status = winner ? ... : ...;`**
- **Neither `winner` nor `status` is stored in `useState`.** They're
  computed fresh, from `squares`, every single time `Board` renders. This is
  **derived state** — data that can always be recalculated from existing
  state, rather than stored redundantly as its own separate state.
- **Why not just add a third `useState` for `winner`?** Because then you'd
  have to remember to update it correctly, by hand, every time `squares`
  changes — reintroducing exactly the "remember to keep two things in sync
  yourself" burden Lesson 8/9 moved away from. Deriving it fresh on every
  render guarantees it can never disagree with `squares`, because it's
  always freshly computed *from* `squares`, not stored separately alongside
  it.

**`function calculateWinner(squares) { const lines = [...]; for (const [a, b, c] of lines) { ... } return null; }`**
- A plain function, **not a component** — it takes data in, returns data
  out, renders nothing itself. Not every function that touches state-derived
  data needs to be a component.
- `lines` — every possible winning combination of three board indices (3
  rows, 3 columns, 2 diagonals), as an array of 3-element arrays.
- `for (const [a, b, c] of lines)` — a **for-of loop** (distinct from the
  `for (let i = 0; ...)` counting loop you already know) combined with array
  destructuring in the loop variable itself: each iteration, `[a, b, c]` is
  destructured directly from the current 3-element sub-array in `lines`.
- `squares[a] && squares[a] === squares[b] && squares[a] === squares[c]` —
  first checks `squares[a]` is truthy (not `null` — an empty square can't be
  a "winning" value), then checks all three positions hold the *same* value.
  `&&` short-circuits: if `squares[a]` is `null`, the rest of the expression
  isn't even evaluated, since the whole thing is already `false`.
- Returns the winning value (`"X"` or `"O"`) the moment any line matches;
  `null` if the loop finishes without finding one.

**`{squares.map((square, i) => (<Square key={i} value={square} onSquareClick={() => handleClick(i)} />))}`**
- Same `.map()`-to-JSX pattern from Lesson 9's todo list, now producing nine
  `Square` elements instead of a variable-length list of todos.
- `onSquareClick={() => handleClick(i)}` — passing a closure that already
  "knows" its own index `i`, exact same technique as Lesson 9's
  `onToggle={() => toggleTodo(index)}`. `Square` itself never needs to know
  *which* index it is — `Board` handles that entirely by baking the correct
  index into each closure before handing it down.

### What happens

Clicking a square calls `handleClick(i)` (via the closure passed down as
`onSquareClick`), which — if the move is legal — clones `squares`, sets the
clicked index to the current player's mark, updates `squares` state, and
flips `xIsNext`. `Board` re-renders (because `useState` setters were
called), recomputing `winner`/`status` fresh from the new `squares`, and
passing each `Square` its updated `value` as a prop — each `Square`
re-renders showing whatever value it was just handed, with zero state or
logic of its own.

## 4. Change one thing

```diff
   const winner = calculateWinner(squares);
   const status = winner
     ? "Winner: " + winner
-    : "Next player: " + (xIsNext ? "X" : "O");
+    : squares.every((s) => s !== null)
+    ? "It's a draw!"
+    : "Next player: " + (xIsNext ? "X" : "O");
```

**What changed:** added a draw check using `.every(...)` (an array method
sibling to `.some()` from Lesson 7 — returns `true` only if *every* element
satisfies the callback; here, every square is non-`null`).
**What did not change:** `handleClick`, `calculateWinner`, and every
`Square` — because `status` is derived state, adding a new displayed
message required touching exactly the one place that computes it, with zero
changes to how or when squares get filled. This is the concrete payoff of
deriving rather than storing: the display logic and the state-mutation logic
stayed completely decoupled.

## 5. Put it in the project

The pattern this lesson exists to teach — state lives in the nearest common
ancestor of everything that needs it, flows down as props, and changes flow
back up only via callback props (never by a child reaching up to modify a
parent's state directly) — is the single most load-bearing React idea for
any UI made of multiple related pieces. Every remaining React lesson in this
series (the dashboard, the canvas game) leans on exactly this shape.

## 6. Trap

Predict, then test: after someone wins, click one of the remaining empty
squares.

Run it — nothing happens, correctly, because of
`if (squares[i] || calculateWinner(squares)) return;`. Now remove just the
`|| calculateWinner(squares)` part of that guard, keeping only
`if (squares[i]) return;`, and try again after a win.

**The trap: the game keeps accepting moves after a winner is already
determined**, silently overwriting the board and potentially "un-winning" a
finished game, because nothing in `handleClick` checks game-over status —
only whether the *specific clicked square* is empty. This is worth noticing
precisely because `winner` being **derived** (recalculated every render)
doesn't automatically protect anything — derived state is still just a
value; if the code that mutates the *underlying* state (`handleClick`)
doesn't explicitly consult it, deriving it correctly elsewhere doesn't stop
bad mutations from happening.

## 7. Exercise

Pick at least one:

- **Predict:** If `Square`'s `onClick={onSquareClick}` were changed to
  `onClick={onSquareClick()}` (calling it immediately, the exact mistake
  flagged back in Lesson 9), what would happen the moment `Board` first
  renders — before any click at all?
- **Modify:** Add a "Reset" button in `Board` that calls
  `setSquares(Array(9).fill(null))` and `setXIsNext(true)`.
- **Break:** Delete the `key={i}` prop entirely and open your browser's
  console. What warning, if any, does React print? Does the game still
  function despite the warning?
- **Trace:** Write out, step by step, everything that happens — every
  variable's value at each point — between clicking the winning square and
  `status` displaying "Winner: X".

## What to remember
- State lives in the nearest common ancestor of every component that needs
  to read or coordinate it — not scattered into whichever child happens to
  display a piece of it first.
- Data flows down as props; changes flow back up only through callback
  props the parent hands down — a child never modifies a parent's state
  directly.
- Derived state (computed fresh from existing state on every render, like
  `winner`/`status` here) avoids two pieces of state ever disagreeing with
  each other — but only protects display, not mutation; guard clauses in
  your update logic still need to check it explicitly.
- `.slice()` (no arguments) and the spread operator are two equally valid
  ways to clone an array before mutating the copy — the underlying rule
  (never mutate what `useState` currently holds) is the same either way.

## Next lesson
Lesson 11 introduces `useEffect` — code that runs in response to a component
rendering or specific state changing, rather than in response to a user
event — using a dashboard that fetches data automatically when it first
loads, and a first custom hook wrapping that fetching logic for reuse.
