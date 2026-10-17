# Linear Algebra Lab: gentle-curve redesign plan

Drafted 2026-10-17. Status: Phases 1–4 done (2026-10-17); Phases 5–6 not started. Session state and next steps: [linear-algebra-lab-handoff.md](linear-algebra-lab-handoff.md).

## Goal

A learner who knows basic algebra (solve 2x + 3 = 7, substitute into a formula, read a graph) and has never programmed can start at lesson 1 and keep going. They finish able to use linear algebra, understand why it works, and derive the rest from a few core ideas. It is a companion to a course or book, not a replacement.

The lab keeps its format: concrete start, notation, prediction, editable example, playground, practice, problem set, proof, review and mastery map.

## What goes wrong today (measured)

- **Every lesson is the same size:** about 230 words and 7–42 lines of code, whatever the difficulty. Ideas per paragraph climb steeply.
- **Lesson 1 asks for too much at once:** 7 lines of code, including plotting commands. Matrix products arrive in lesson 4. "Beginner" covers dot products, projections and determinants within 12 lessons.
- **No "why":** no lesson says why you would want the tool. The SVD arrives as a factorisation with no reason to care.
- **Narrow applications:** machine learning, data science and dynamic programming. Engineering, physics, graphics and everyday uses are missing.
- **No calculus:** gradient descent uses a gradient that was never explained.

## Design rules

1. **Why first.** Every module opens with a *Why you'd care* lesson. It shows a real problem with a picture and needs no code, and the tool arrives as the answer. Example: the SVD module opens by compressing a photo to 5% of its size.
2. **One new idea per lesson, as many angles as it needs.** Easy ideas stay short (about 120 words, 10 minutes). Hard topics get several viewpoints in an *Another way to see it* section: the picture, the numbers, the algebra, the physical meaning. Short is not the goal; clear is.
3. **A code on-ramp.**
   - Stage 1 lessons show 1–3 lines.
   - Drawing code lives in a separate, collapsed "drawing code (you don't need this yet)" block.
   - Early challenges are "change one number" or "fill in one blank"; writing several lines comes later.
   - Loops and plotting are taught only when a lesson needs them.
4. **Calculus where it is needed, intuition first.**
   - Slope as "zoom in until the curve looks straight".
   - The gradient as an uphill arrow on a hill map.
   - The Jacobian as "the matrix a curved map looks like up close".
   - Then gradient descent, and differential equations x′ = Ax for vibrations.
5. **Applications across fields.** Each lesson is tagged with where it shows up:
   - Graphics & games
   - Engineering & physics (forces, trusses, circuits, stress tensors, vibration)
   - Data & machine learning
   - Everyday (money, recipes)
   - Networks (PageRank)
   - Images (compression)
6. **Discoverer's path.** Core results are derived before they are stated: "Derive it" uses the proof stepper.
7. **Lesson ids never change.** Existing lessons are re-sequenced, slimmed or moved to optional tracks; their progress keys stay.
8. **Case studies by background.** Each lesson has a *Where you'll use it* card with short case studies. One is general, and the others are written for a CS student, an ML/data engineer, a mechanical/civil engineer, an electrical engineer, a physicist or a maths student. The learner picks their background once (saved), sees their case study first, and can open the others.

## The new arc

N = new lesson, E = existing lesson (reworked where noted).

### Stage 1 — See it (no coding experience needed)

| Module | Lessons |
|---|---|
| Why linear algebra? | N: A tour: games rotate characters, bridges balance forces, photos shrink, Google ranks pages. All of it is lists of numbers and tables that move them. |
| Vectors: arrows and lists | N: What is a vector (a move on a map, a recipe) · E: Your first line of code (slimmed to 2 lines) · N: Adding and scaling vectors · E: Mixing ingredients (combinations) · E: How long is it? Pythagoras for vectors |
| The dot product | N: A shopping bill is a dot product · E: Angles and perpendicular directions · E: Shadows: projection (work done by a force on a slope) |

### Stage 2 — Use it

| Module | Lessons |
|---|---|
| Matrices are machines | E: A table of numbers · N: Matrix × vector = many dot products at once (prices at several shops) · N: Angles as points on a circle (sin and cos, gently) · E: Moving pictures: scale, shear, rotate · E: One move after another · E: Undoing a move · E: Area and the determinant · E: Two meanings of multiplication |
| Solving many equations at once | N: Why: balance a chemical equation, mix an alloy · E: Elimination by hand, then by code · E: One, none or infinitely many answers · N: Forces in a bridge truss · N: Currents in a circuit |

### Stage 3 — Understand it

| Module | Lessons |
|---|---|
| Space and directions | E: span and rank · E: the Spaces and bases lessons, gentler |
| Best fit | N: Why: find your position from noisy GPS satellites · E: least squares, Gram–Schmidt, QR, orthogonal matrices |
| Calculus meets matrices | N: Slope: zoom until it is straight · N: Many inputs: the gradient as an uphill arrow · N: A curved map looks like a matrix up close (Jacobian) · E: Gradient descent, gentler · E: When descent converges |
| Directions that don't turn | N: Why: a bridge that shakes itself apart (resonance) · E: eigenvectors and repeated processes · E: diagonalization · E: spirals · E: Markov chains · N: Google's PageRank · N: Vibrations: x′ = Ax and natural frequencies |
| Tensors in the real world | N: Stress in a material: the matrix that turns a cut into a force · N: Principal stresses: the directions with no shear (eigenvectors) · N: Mohr's circle · N: Why a spinning book wobbles (inertia tensor) · E: the spectral theorem · E: positive definite energy |
| The SVD: the shape of any matrix | N: Why: compress a photo, clean a noisy one · E: circle to ellipse · E: SVD and compression · E: PCA |

### Stage 4 — Apply it (optional tracks, any order)

- **Machine learning:** gradients, logistic regression, a neural network, regression validation, ridge.
- **Decisions:** policy evaluation, backward induction, value iteration, the two capstones.
- **Graphics & 3D (new):** homogeneous coordinates, cameras and perspective.
- **Engineering (new):** spring networks and finite elements, vibration modes.

## Infrastructure needed

- **Lesson fields:**
  - `why`: the motivation story, with a picture or playground.
  - `uses`: case studies by background, also shown as domain tags.
  - `angles`: extra viewpoints for hard topics.
  - `demo.draw`: drawing code shown collapsed and appended at run time.
  - `track`: marks a lesson as optional.
  - `derive`: the Derive-it stepper.
- **Sidebar:** shows stages, and optional tracks as a separate group.
- **New playgrounds:**
  - Photo compression by SVD (a small greyscale image, a rank slider).
  - Stress on a cut plane with Mohr's circle.
  - A hill map with gradient arrows.
  - A truss whose member forces solve as you load it.
- **Problem sets for new lessons:** six families each, gentle for Stage 1. The practice test requires them.

## Build order (one phase per session, checked before the next)

1. **Phase 1 (done):** infrastructure, plus Stage 1 (Why linear algebra, Vectors, Dot product). About 4 new and 6 reworked lessons.
   - Built: `why`, `uses` (case studies by background, with a saved background picker), `angles`, `demo.draw`, and stages in the sidebar and opening screen.
   - Content: 4 new lessons and 6 rewritten ([stage1.js](../src/labs/linear-algebra-lab/lessons/stage1.js), [uses.js](../src/labs/linear-algebra-lab/lessons/uses.js)), plus 19 new gentle problem families ([practice/stage1.js](../src/labs/linear-algebra-lab/practice/stage1.js)).
   - Not yet built: `track` (optional tracks, Phase 6) and `derive` (Derive-it before the formula). Projection already derives its formula in the prose.
   - Known wrinkle: the workspace shows a column vector as "1 × 2", because the engine stores vectors flat.
2. **Phase 2 (done):** Stage 2, including the truss and circuit lessons and the truss playground.
   - Built: 5 new lessons (matrix × vector, angles on a circle, many conditions at once, bridge truss, circuit) and 8 rewritten ([stage2.js](../src/labs/linear-algebra-lab/lessons/stage2.js)).
   - Case studies for all 14 Stage 2 lessons, extra angles for 8, and 30 new problem families ([practice/stage2.js](../src/labs/linear-algebra-lab/practice/stage2.js)).
   - New playgrounds: unit circle and bridge truss.
   - Module "Systems and subspaces" is now "Solving many equations"; span and rank moved to Stage 3. Lessons are ordered by the `STAGES` list.
   - Engine: two-output `max`/`min`, and the output count no longer leaks into user-function bodies.
3. **Phase 3 (done):** Calculus meets matrices, including the hill-map playground and the gradient-descent rework.
   - Built: new Stage 3 module of 6 lessons ([calculus.js](../src/labs/linear-algebra-lab/lessons/calculus.js)): slope, gradient, Jacobian and chain rule (new); gradient descent and step size (rewritten, moved out of the ML track).
   - Case studies and extra angles for all 6, plus 24 new problem families ([practice/calculus.js](../src/labs/linear-algebra-lab/practice/calculus.js)).
   - Playgrounds: zoom to straight, hill map with gradient steps, and curved map with its Jacobian.
   - Fixed: results holding an anonymous function (`f = @(x) ...`) could not cross from the worker to the page. Worker output is now made cloneable, and a test guards it.
   - Stage 4 modules are now optional tracks with at least 2 lessons; core modules still need at least 4.
4. **Phase 4 (done):** Directions that don't turn, plus Tensors in the real world, including the stress / Mohr playground.
   - Built in [eigen.js](../src/labs/linear-algebra-lab/lessons/eigen.js). Six new lessons: PageRank, vibrations, stress tensor, principal stresses, Mohr's circle and inertia tensor. Three rewritten, keeping their ids: eigenvectors, Markov chains and symmetric energy. The Markov lesson moved out of the Dynamic programming track.
   - Diagonalization and spirals joined "Directions that don't turn"; positive definite joined "Tensors in the real world". The old "Spectral thinking" and "Spectral theory" modules are gone: PCA, SVD and the spectral theorem form "The SVD: the shape of any matrix", which has 3 lessons (a test exception until Phase 5).
   - Why stories, case studies and extra angles for all 12 lessons of the two modules, plus 36 new problem families ([practice/eigen.js](../src/labs/linear-algebra-lab/practice/eigen.js)).
   - Playgrounds: PageRank step by step (toggle the links), vibration modes (animated), and stress on a cut with a live Mohr's circle.
5. **Phase 5 (done, 2026-10-17):** The SVD module, in the order: compress a photo (new, `laml-svd-photo`), inside the SVD (`laml-svd-low-rank`, rewritten), PCA, then the spectral theorem.
   - Lessons in [lessons/svd.js](../src/labs/linear-algebra-lab/lessons/svd.js); why stories, case studies and angles for all four; 12 new problem families ([practice/svd.js](../src/labs/linear-algebra-lab/practice/svd.js)).
   - Playground: "Compress a photo (SVD)" with three built-in pictures (landscape, tartan, static), a k slider, the k-th layer on its own, the strengths, storage and error.
   - The 3-lesson test exception is gone; every lesson but the opening tour now has a problem set.
6. **Phase 6:**
   - re-sequence Stage 3;
   - move the applied lessons into Stage 4 tracks;
   - fix the 15 guessable problem families;
   - replace the remaining "mastery" wording.
