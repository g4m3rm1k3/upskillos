# Frontend Mastery Curriculum — Apps & Games, Vanilla JS → React

Format: every lesson follows the Adaptive Technical Lesson Schema you supplied —
mechanical code explanation is mandatory, not just "what this does" summaries.

You already know JS/Python basics (loops, conditionals, datatypes). Your stated
gap is OOP — so Phase B is where classes get introduced deliberately, through
game entities, where they earn their keep instead of feeling bolted on.

Work through these on your own pace, one file at a time, typing the code
yourself into `src/` rather than copy-pasting.

---

## Phase A — Vanilla JS Foundations (DOM & Events)

- **Lesson 1 — App: Click Counter**
  DOM selection, event listeners, mutating text content, the render-after-state-change pattern.
- **Lesson 2 — Game: Number Guessing Game**
  Conditionals driving UI feedback, functions as organizing units, basic game state (attempts, won/lost).
- **Lesson 3 — App: Todo List**
  Arrays as state, re-rendering a list from data, event delegation (why you don't attach a listener per item).
- **Lesson 4 — Game: Reaction Timer (Whack-a-Mole style)**
  `setTimeout`/`setInterval`, CSS class toggling for animation, cleanup (why timers leak if you don't clear them).

## Phase B — JS OOP for Frontend (your stated gap)

- **Lesson 5 — Game: Canvas Pong**
  `class Ball`, `class Paddle` — why objects instead of loose variables once you have >1 moving thing.
  `requestAnimationFrame` game loop.
- **Lesson 6 — App: Quote/Fact Generator (fetch)**
  `async`/`await`, wrapping an API call in a small service class, error handling.
- **Lesson 7 — Game: Snake**
  Multiple interacting objects (snake body, food, board), collision detection, encapsulating game state
  in a class instead of scattered globals.
- **Lesson 8 — App: Weather Dashboard**
  A `State` class as the single source of truth, methods vs. free functions, why this matters before React.

## Phase C — React

- **Lesson 9 — App: Todo, rebuilt in React**
  Components, props, `useState` — and an explicit compare-and-contrast against your Lesson 3 vanilla version.
- **Lesson 10 — Game: Tic-Tac-Toe in React**
  Component composition, "lifting state up," immutability (why React fights you if you mutate state directly).
- **Lesson 11 — App: Dashboard with `useEffect`**
  Data fetching as a side effect, dependency arrays, a first custom hook.
- **Lesson 12 — Game: Canvas game inside React**
  `useRef` to escape React's render cycle, reconciling an imperative game loop with a declarative framework.

## Capstone

- **Lesson 13 — Ship one app + one game**
  Polish, combine into one small multi-page site, deploy.

## Phase D — CSS Foundations (the gap: layout, animation, forms, AJAX)

- **Lesson 14 — Box Model & Flexbox/Grid**
  How boxes actually size and lay out — the prerequisite everything else in Phase D needs.
- **Lesson 15 — Transitions & the Math of Easing**
  `transition`, `transform`, cubic-bezier curves — math applied directly to motion.
- **Lesson 16 — Keyframe Animations & a Real Loading Screen**
  `@keyframes`, building an actual spinner/skeleton screen from scratch.
- **Lesson 17 — Forms, For Real**
  Native `<form>` behavior, input types, validation — untouched by Lessons 1-13.
- **Lesson 18 — FastAPI Backend Basics**
  A real Python backend to submit to — routes, Pydantic models, CORS, running it locally.
- **Lesson 19 — AJAX Form Submission, Connected to a Real Backend**
  Submit Lesson 17's form via `fetch` to your own FastAPI endpoint — real request/response, real errors.

## Phase E — Math Through CSS

- **Lesson 20 — Trigonometry I: Sine/Cosine Motion**
  Bobbing, orbiting, wave-driven elements using `sin`/`cos`.
- **Lesson 21 — Trigonometry II: Rotation & Angles**
  `rotate()`, angle math, a clock/dial-style UI.
- **Lesson 22 — Vectors: Following & Parallax**
  Mouse-following elements, parallax scroll, vector math (magnitude/direction/normalization).
- **Lesson 23 — Linear Algebra I: Transforms as Matrices**
  `translate`/`scale`/`rotate` as matrix operations — what `matrix()` actually encodes.
- **Lesson 24 — Linear Algebra II: Composing Transforms**
  Chaining transforms, `transform-origin`, order-of-operations pitfalls.
- **Lesson 25 — Calculus I: Derivatives as Velocity**
  Easing curve steepness, spring-like motion, rate-of-change intuition.
- **Lesson 26 — Calculus II: Integration & Physics-Based Motion**
  Acceleration → velocity → position, building a bouncing/gravity animation from scratch.
- **Lesson 27 — Interpolation: Building Your Own Easing Function**
  `lerp`, writing a custom easing function instead of relying on built-in curves.

---

### Status
- [ ] Lesson 1
- [ ] Lesson 2
- [ ] Lesson 3
- [ ] Lesson 4
- [ ] Lesson 5
- [ ] Lesson 6
- [ ] Lesson 7
- [ ] Lesson 8
- [ ] Lesson 9
- [ ] Lesson 10
- [ ] Lesson 11
- [ ] Lesson 12
- [ ] Lesson 13
- [ ] Lesson 14
- [ ] Lesson 15
- [ ] Lesson 16
- [ ] Lesson 17
- [ ] Lesson 18
- [ ] Lesson 19
- [ ] Lesson 20
- [ ] Lesson 21
- [ ] Lesson 22
- [ ] Lesson 23
- [ ] Lesson 24
- [ ] Lesson 25
- [ ] Lesson 26
- [ ] Lesson 27
