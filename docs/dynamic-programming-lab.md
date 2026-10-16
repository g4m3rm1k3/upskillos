# Dynamic Programming Lab

The lab at `#/lab/dynamic-programming` is a growing curriculum with a recursion walkthrough. Its discovered
metadata and component live in `src/labs/dynamic-programming/`.

## Scope and status

The shell provides an independently scrollable, nested concept navigation panel,
search across names and learning scopes, difficulty filtering, expand/collapse
controls, a coverage overview, and selectable concept previews. Difficulty is
communicated with both color and text. Narrow windows stack the navigation above
the preview. The recursion concept offers a walkthrough, an inspectable call-stack trace, and a checked prediction exercise. Other concepts and editable coding practice remain **coming soon**.

The curriculum source of truth is `curriculum.js`. UI counts are computed from
that data. Each concept has a stable ID, a title, an explicit learning scope, and
a status. Order is independent of IDs. Topic families sit inside these levels:

- Foundations: recursion, state design, correctness, implementation, and testing.
- Core patterns: linear states, grids, knapsack, and combinatorial counting.
- Structured problems: subsequences, string alignment, intervals, and scheduling.
- Advanced state spaces: DAGs, trees, subsets, digit states, and automata.
- Optimization toolkit: memory and transition reduction, split optimization,
  algebraic acceleration, and subset transforms.
- Specialist frontiers: profile/connectivity DP, uncertainty, games, parsing,
  probabilistic inference, control, approximation, and parameterized methods.

This is an extensible coverage map, not a claim that the literature has a finite,
exhaustive list of DP topics. Specialist topics include assumptions and boundary
conditions in their scopes. Some techniques use cyclic fixed points or linear
systems rather than finite acyclic tabulation; their future lessons must explain
that distinction. Difficulty levels suggest progression but do not enforce
prerequisites, and related concepts can cross level boundaries.

## Building each concept next

1. Write an intuition-first walkthrough with prerequisites, state meaning,
   transitions, base cases, evaluation order, correctness, and complexity.
2. Add a worked example with inspectable state transitions and reconstruction
   where relevant.
3. Add an independent problem with Python and JavaScript starters, progressive
   hints, reference solutions, and tests that reject plausible wrong answers.
4. Integrate safe execution and feedback before marking practice available.
5. Verify the complete learner flow in a browser before changing its status.

For harder problems, hints are optional and progressively revealed, one at a
time: a small observation, a guiding question about the learner's reasoning,
then a tiny test case or invariant checkpoint. Do not reveal the full recurrence,
solution code, or final answer through hints. Author each hint for its particular
problem and review it for spoilers. The shell previews these stages with disabled
coming-soon controls; the recursion prediction check has individually revealed hints.

The recursion language selector switches between Python and JavaScript reference
examples. Other concepts retain labeled workspace previews. There is no code
editor, execution engine, or completion tracking yet. The prediction check is
local feedback, not a coding assessment. A `walkthrough` status does not imply
that a full coding problem is available. No placeholders count as completed
learning material.

## Verification (2026-10-16)

- `npm run typecheck` completed with exit code 0 and no diagnostics.
- `npx vitest run src/labs/dynamic-programming src/data/catalogNavigation.test.js src/routes.test.js --testTimeout 60000`
  printed `Test Files 3 passed (3)` and `Tests 11 passed (11)`. This covers
  concept IDs, scope search, level intersections, empty-search recovery, collapsed
  navigation, language previews, disabled execution, hint placeholders, catalog
  discovery, and route coverage. The run used a workspace-local TEMP/TMP directory
  after the Windows sandbox denied Vitest's initial temporary-file rename. The
  route scan exceeded the default five-second timeout on the first retry.
- `npm run facts` regenerated the catalog; `npm run catalog:check` printed that
  lesson titles, lesson IDs, and project facts are current. Both reported the
  existing `14 content problem(s)` listed in the generated inventory.
- Browser verification: opened through the discovered lab route, checked the
  overview and independent scroll panels, searched for plug DP, opened its
  preview, selected JavaScript, and inspected the progressive hint policy.
  Opening the lab in a 390px-wide viewport verified the stacked layout. The
  shared window manager retains old window dimensions if the browser is resized
  after opening a window; reopening after a page reload uses the new width.
- The temporary preview server was stopped after inspection. No production
  build or Python/JavaScript execution was needed for this placeholder shell.


## Recursion walkthrough verification (2026-10-16)

- `npx vitest run src/labs/dynamic-programming` printed `Test Files 2 passed (2)`
  and `Tests 6 passed (6)`. It checks trace sums, balanced frames, maximum depth,
  zero input, reversible stepping, language selection, wrong/correct prediction
  feedback, progressive hints, and the existing curriculum navigation.
- `npm run typecheck` completed with exit code 0 and no diagnostics.
- Browser verification: opened the discovered lab, selected recursion, switched
  to JavaScript, advanced the trace, submitted an incorrect prediction, revealed
  a hint, and submitted a correct prediction. The narrow lab window stacked
  navigation and content and displayed the exercise without horizontal clipping.
- Remaining work: repeated-subproblem walkthroughs, editable and safely executed
  Python/JavaScript challenges, and completion tracking.
