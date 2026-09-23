# Lesson 33 — Verlet Integration & Simple Particle/Cloth Systems

## What you'll learn
- Verlet integration — a second way to integrate motion, tracking
  *previous position* instead of an explicit velocity variable
- Why Verlet is more numerically stable than Lesson 26's Euler integration
  at larger time steps
- Constraints — fixed-distance rules between points, and how repeatedly
  enforcing them produces rope/cloth-like behavior
- Building a simple hanging rope (a chain of connected particles) that
  sags and swings realistically

## What you'll build
A single bouncing particle using Verlet integration instead of Euler
(compared directly against Lesson 26's version), then a multi-point rope
that hangs and sways under gravity, held together by distance constraints.

## The question
Lesson 26's Euler integration tracked `position` and `velocity` as two
separate variables. What if you *only* tracked position — twice, at the
current and previous frame — and derived everything about motion from just
comparing those two? Would that even be enough information to simulate
motion at all?

## 1. Predict

If you know a particle's position *right now* and its position *one frame
ago*, predict: could you compute an implied velocity from just those two
numbers alone, without ever storing a separate velocity variable at all?
What arithmetic would give you that implied velocity?

## 2. Try it — Verlet integration for one particle

```js
let currentPosition = 0;
let previousPosition = 0;
const gravityAcceleration = 0.5;
const timeStep = 1;

function verletStep() {
  const impliedVelocity = currentPosition - previousPosition;
  const nextPosition =
    currentPosition + impliedVelocity + gravityAcceleration * timeStep * timeStep;

  previousPosition = currentPosition;
  currentPosition = nextPosition;
}

for (let frame = 0; frame < 5; frame++) {
  verletStep();
  console.log("frame", frame, "position:", currentPosition);
}
```

### What this code does

**`const impliedVelocity = currentPosition - previousPosition;`**
- **This is the direct answer to your Predict question.** Rather than
  storing velocity as its own tracked variable (Lesson 26's approach),
  Verlet integration **derives** velocity, implicitly, every step, just by
  subtracting the previous position from the current one — the exact same
  "change in position over one time step" idea as any velocity, just never
  given its own persistent variable. This is a genuinely different
  structural choice, not merely a renamed version of Euler integration.

**`const nextPosition = currentPosition + impliedVelocity + gravityAcceleration * timeStep * timeStep;`**
- Notice the **shape** of this formula: current position, plus the implied
  velocity (carrying motion forward, same as Lesson 26), plus an
  acceleration term. **This specific formula is called the Verlet
  integration formula**, and it comes from a real physics/numerical-
  methods derivation (a Taylor series expansion, a topic beyond this
  lesson's scope to derive fully) — the practical fact to retain is that
  it reconstructs the same physical result as Lesson 26's Euler approach
  (position advancing under velocity and acceleration) using a different
  set of tracked quantities.

**`previousPosition = currentPosition; currentPosition = nextPosition;`**
- Both tracked values shift forward one step — `previousPosition` becomes
  what `currentPosition` was, and `currentPosition` becomes the newly
  computed value. **No velocity variable exists anywhere in this code at
  all** — the entire simulation runs on nothing but two position values,
  updated together every frame.

### What happens

The particle accelerates downward under constant `gravityAcceleration`,
producing motion that looks identical, frame to frame, to Lesson 26's
Euler-integrated falling ball — despite never storing an explicit velocity
variable anywhere.

## 3. Why — Verlet's real advantage: stability at larger time steps

```js
function eulerStep(state, timeStep) {
  state.velocity += state.acceleration * timeStep;
  state.position += state.velocity * timeStep;
}

function verletStepGeneral(state, timeStep) {
  const impliedVelocity = state.currentPosition - state.previousPosition;
  const nextPosition =
    state.currentPosition + impliedVelocity +
    state.acceleration * timeStep * timeStep;
  state.previousPosition = state.currentPosition;
  state.currentPosition = nextPosition;
}
```

**Run both with a deliberately large `timeStep` (e.g. `timeStep = 2`, far
larger than a real frame's actual elapsed time) over many iterations, and
compare the results.**

- Lesson 26 already showed that a large, fixed `dt` introduces visible
  error and instability in Euler integration. **Verlet integration
  generally degrades more gracefully at larger time steps than Euler
  does**, for a genuine mathematical reason: Verlet's formula is derived
  to cancel out a certain category of error term that Euler's simpler
  formula doesn't — this is precisely why Verlet integration is the
  standard choice in real physics engines and cloth/rope simulations
  specifically, where stability under imperfect, variable frame timing
  matters more than raw precision.
- **This is a real, working-engineer-relevant fact, not just an academic
  curiosity**: if you've ever seen a game's physics "explode" (objects
  flying apart unrealistically) after a frame-rate stutter, an
  under-stabilized Euler integration under a suddenly large `dt` is a
  common real cause — Verlet's added stability is a genuine, practical
  reason it's preferred for exactly this kind of simulation.

## 4. Change one thing

```diff
 function verletStep() {
   const impliedVelocity = currentPosition - previousPosition;
+  const dampedVelocity = impliedVelocity * 0.99;
   const nextPosition =
-    currentPosition + impliedVelocity + gravityAcceleration * timeStep * timeStep;
+    currentPosition + dampedVelocity + gravityAcceleration * timeStep * timeStep;
```

**What changed:** the implied velocity is now damped (multiplied by
`0.99`) before being used, the same damping *concept* as Lesson 25's
spring, applied here to Verlet's implicit velocity instead of an explicit
one.
**What did not change:** there's still no explicit velocity variable
anywhere — damping is applied to the *computed* implied velocity, in the
same step it's derived, rather than to a persistent stored value.
**Worth noticing**: this is a genuinely different way of introducing
damping/friction than Lesson 25's `velocity *= damping;` line, because
there's no persistent velocity to directly shrink — you have to damp the
*implied* velocity at the point of use, every single step, since nothing
about it persists between frames on its own.

## 5. Put it in the project — a hanging rope via constraints

```js
const pointCount = 10;
const points = [];

for (let i = 0; i < pointCount; i++) {
  points.push({
    currentPosition: { x: i * 20, y: 0 },
    previousPosition: { x: i * 20, y: 0 },
    isPinned: i === 0
  });
}

const restingDistance = 20;
const gravity = { x: 0, y: 0.5 };

function updatePositions() {
  for (const point of points) {
    if (point.isPinned) continue;

    const impliedVelocityX = point.currentPosition.x - point.previousPosition.x;
    const impliedVelocityY = point.currentPosition.y - point.previousPosition.y;

    const nextX = point.currentPosition.x + impliedVelocityX + gravity.x;
    const nextY = point.currentPosition.y + impliedVelocityY + gravity.y;

    point.previousPosition = { ...point.currentPosition };
    point.currentPosition = { x: nextX, y: nextY };
  }
}

function satisfyConstraints() {
  for (let i = 0; i < pointCount - 1; i++) {
    const pointA = points[i];
    const pointB = points[i + 1];

    const deltaX = pointB.currentPosition.x - pointA.currentPosition.x;
    const deltaY = pointB.currentPosition.y - pointA.currentPosition.y;
    const currentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const correctionAmount = (currentDistance - restingDistance) / currentDistance;

    const correctionX = deltaX * 0.5 * correctionAmount;
    const correctionY = deltaY * 0.5 * correctionAmount;

    if (!pointA.isPinned) {
      pointA.currentPosition.x += correctionX;
      pointA.currentPosition.y += correctionY;
    }
    if (!pointB.isPinned) {
      pointB.currentPosition.x -= correctionX;
      pointB.currentPosition.y -= correctionY;
    }
  }
}

function simulationStep() {
  updatePositions();
  for (let iteration = 0; iteration < 5; iteration++) {
    satisfyConstraints();
  }
}
```

### Code walkthrough

**`isPinned: i === 0`**
- The very first point in the rope is **pinned** — it never moves, no
  matter what gravity or constraints try to do to it, simulating a rope
  tied to a fixed point. Every point-updating function checks this flag
  and skips movement entirely for pinned points.

**`updatePositions()`** — Verlet integration, applied per-point
- Exactly Section 2's single-particle Verlet formula, run independently
  for every non-pinned point in the rope, per axis (x and y separately,
  same "2D lerp is just two 1D lerps" idea from Lesson 28, now applied to
  Verlet instead).

**`satisfyConstraints()` — the actual rope-like behavior**
- `restingDistance` — how far apart two connected points are *supposed*
  to be (the rope's natural, unstretched segment length).
- `currentDistance` — how far apart they **actually** currently are
  (Lesson 22's Pythagorean magnitude calculation, reused here).
- `correctionAmount` — how far off from `restingDistance` the actual
  distance currently is, expressed as a fraction of that actual distance.
- `correctionX`/`correctionY`, split by `0.5` — **each point is pulled
  halfway toward satisfying the constraint**, rather than one point being
  forced to the "correct" position entirely. This is deliberate: if only
  one point moved fully, that point's own other connections would
  immediately be thrown out of alignment; splitting the correction evenly
  between both connected points lets the whole rope settle into a
  consistent shape gradually, across many satisfied constraints, rather
  than each single constraint fighting the others for dominance.

**`for (let iteration = 0; iteration < 5; iteration++) { satisfyConstraints(); }`**
- **Running the constraint-satisfying step multiple times per frame,
  repeatedly, on the same positions.** A single pass at fixing one
  constraint can throw a neighboring constraint slightly out of alignment
  (since points are shared between adjacent segments) — repeating the
  process several times lets corrections **propagate** along the rope,
  each pass getting the overall shape closer to fully consistent. This is
  a standard, real technique (sometimes called "relaxation") for
  constraint-based simulation generally, not specific to rope/cloth.

### What happens

Every simulation step, gravity pulls every non-pinned point downward via
Verlet integration, then five rounds of constraint-satisfaction pull
each connected pair back toward their resting distance — the combination
produces a rope that visibly sags under its own gravity while staying
connected, swinging and settling in a way that looks convincingly
physical, entirely from repeated local corrections rather than any single
global rope-shape formula.

## 6. Trap

Predict, then test: reduce the constraint-satisfaction loop from 5
iterations down to 1, keeping everything else identical.

Run it. **The trap: the rope now visibly stretches — segments end up
noticeably longer than `restingDistance`, especially near the pinned end,
rather than maintaining a consistent rope-like shape.** This is the
precise, visible consequence of insufficient relaxation: with only one
pass, corrections at one end of the rope never fully propagate to the
other end within a single frame — each frame's gravity pull adds a little
more stretch than one pass of correction can fully resolve, and the rope
never quite catches up. **More iterations cost more computation per
frame** (a real, concrete performance/accuracy tradeoff, not free) — this
is worth explicitly framing as a tradeoff rather than "more is always
better": a real project balances constraint iteration count against how
many simulated ropes/points it can afford per frame at a target frame
rate.

## 7. Exercise

- **Predict:** If `restingDistance` were made *smaller* than the points'
  actual initial spacing (`i * 20` in the setup), what would you expect to
  happen to the rope's shape immediately, before gravity even has much
  effect?
- **Modify:** Pin **both** ends of the rope (`isPinned: i === 0 || i ===
  pointCount - 1`) instead of just the first — observe how the shape
  changes from a hanging tail to a sagging arc (a catenary-like curve,
  the real shape a hanging chain naturally forms).
- **Break:** Set `gravity.y` to a large value (e.g. `5` instead of `0.5`)
  with only 1 constraint iteration. Does the rope hold together at all, or
  does it visibly fly apart / stretch dramatically? Connect this to the
  Trap section's iteration-count tradeoff directly.
- **Trace:** For two adjacent points exactly `30` units apart (with
  `restingDistance = 20`), compute `currentDistance`, `correctionAmount`,
  and the resulting `correctionX` (assuming `deltaX = 30, deltaY = 0`) by
  hand — confirm the correction pulls them closer together, not further
  apart.

## What to remember
- Verlet integration derives velocity implicitly from current and previous
  position, rather than storing it as a separate variable — a genuinely
  different structural choice from Lesson 26's Euler integration, not
  just a renamed version of it.
- Verlet is more numerically stable at larger/inconsistent time steps than
  Euler — the real, practical reason it's the standard choice for
  physics engines and cloth/rope simulation specifically.
- Distance constraints, satisfied repeatedly (relaxation) across many
  points, produce realistic rope/cloth behavior from purely local rules —
  no single global "rope shape" formula is involved anywhere.
- More constraint iterations produce a more accurate, less-stretchy
  result, at a real computational cost — a genuine tradeoff to balance,
  not a free win.

## Next lesson
Lesson 34 — Perlin noise — is the last lesson in the current roadmap:
smooth, organic randomness for motion, replacing `Math.random()`'s harsh
jitter with something that looks genuinely natural, closing out the math
track.
