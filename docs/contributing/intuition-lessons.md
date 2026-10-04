# Contributing a standalone intuition lesson

The connected maths lab lives in `src/labs/where-maths-comes-from/`. Each file
in its `lessons/` folder exports one lesson. `registry.js` discovers those files
with Vite; contributors do not edit a central list.

Start by copying [the template](../templates/intuition-lesson.js) into that
folder. Keep helpers outside `lessons/`, because every `.js` file there is
expected to be a lesson.

## The contract

The runtime validator is [schema.js](../../src/labs/where-maths-comes-from/schema.js).
Call `defineLesson()` with these fields:

| Field | Meaning |
| --- | --- |
| `id` | Unique, stable, letter-led identifier. Preserve it when moving or renaming a file. |
| `title` | A short name for the experience. |
| `chapter` | A descriptive group, not a requirement to complete another lesson. |
| `order` | Default position in this lab; filenames do not determine order. |
| `prompt` | An observation or experiment the learner can make in the scene. |
| `panels.explore` | The concrete situation and its controls. |
| `panels.scene` | The main interactive model. |
| `panels.connections` | A second view, related experiment, or space to inspect selections. May be empty. |
| `panels.explanation` | Optional mathematical language and further connections, disclosed in a details panel. |
| `discovery.start` | A description of the concrete starting situation. |
| `discovery.notice` | What can be investigated without prescribing a technique. |
| `discovery.question` | The useful question displayed before any action. |
| `discovery.transfer` | An optional prompt applying the relationship to a new situation. |
| `discovery.views` | Optional array of `{ target, label }` for views hidden until chosen. Each target is a local DOM id. |
| `mount(context)` | Initialises only this lesson's state and interactions. |

`schemaVersion` is supplied as `1`. Other versions are rejected. Panel markup
is repository-owned HTML, not a runtime upload format. Use accessible labels,
semantic buttons, and keyboard equivalents for SVG interactions. Use the
shared `--a`, `--b`, `--c`, `--ink`, and `--paper` colours instead of naming
colours in the explanation: the app theme may change them.

## Explanations belong to the current state

`context.say(observation, why, tryNext)` fills the explanation panel. Call it
initially and after meaningful changes. The renderer replaces the initial
explanation with `discovery.start`, `notice`, and `question` after mounting,
so a generated model does not announce its solution before exploration.
Optional view controls are installed after the model mounts. Each argument is plain text:

- **Observation:** describe what the learner just changed or is looking at.
- **Why:** explain the relationship responsible for that behaviour, referring
  to the visible objects and their present state.
- **Try next:** suggest a specific action that tests or extends the relationship.

Write different explanations for meaningful cases. An empty collection, a
completed bundle, and an unfinished bundle should not share one generic
caption with a different number. An explanation of chance must distinguish
possible outcomes, observed samples, and long-run tendencies. An explanation
of motion must distinguish distance, average speed, and instantaneous speed.

Use notation when it helps name an already-visible relationship. Put optional
formal detail in `panels.explanation`; the main explanation should make sense
without opening it. A learner should be able to investigate without supplying
an equation answer to unlock the experience. Visiting or exploring a lesson is not recorded as mastery. An optional
assessment can collect independent evidence after exploration.

Animations can update explanations at useful milestones rather than announce
every frame. The state panel intentionally has no live announcement region,
so animation does not flood a screen reader with repeated messages.

## Runtime and independence

The context provides `root`, scoped `$(id)` lookup, `el(tag, attributes, parent)`
for SVG, and `on(element, event, handler)` with listener cleanup. It also provides
`PC(n, k)` for selection counts and `Tn(n)` for triangular totals.

Use its `requestAnimationFrame`, `cancelAnimationFrame`, `setInterval`, and
`clearInterval` wrappers. The renderer cancels outstanding work when the
lesson is hidden or unmounted. Return `{ pause(), dispose() }` if your own
flags or transient objects also need resetting. Do not read another lesson's
DOM or state. Local DOM ids are scoped to a lesson instance.

[LessonExperience.jsx](../../src/labs/where-maths-comes-from/LessonExperience.jsx)
can render any lesson independently inside a sized container. To compose a
course in a different order, use `sequenceByIds(['l14', 'l1'])` from
[registry.js](../../src/labs/where-maths-comes-from/registry.js), then render each
selected definition with `LessonExperience`. The lab preserves state when
switching experiences during one visit; it does not persist that state across
reloads. Assessment progress is saved separately from the exploratory scene.

## Verification

Run:

```sh
node scripts/check-intuition-lessons.mjs
npx vitest run src/labs/where-maths-comes-from
npm run docs:check
```

The tests discover every lesson and mount it independently. Add a behaviour
test showing that your meaningful state changes update the explanation, and
verify any mathematical claims with boundary cases. Open the lab at
`#/lab/where-maths-comes-from` to check visual layout and interaction. Inspect
both the desktop grid and a narrow window; passing a schema test cannot tell
you whether the scene is readable. Stop your temporary preview server when
finished.

## Counting assessment pilot

`rocks.js` declares optional `assessment: { kind: 'counting', collections: [2, 0, 7, 3, 0, 6] }`.
The schema requires integer collection sizes from zero through eight, including
empty, small (one through four), and scattered (five through eight) cases.
This is a counting-specific pilot, not a generic quiz format for every concept.

The React assessment asks the learner to notice a matching record, predict a
new arrival, then construct records for fresh collections. Guided answers do
not grant mastery. A hint or incorrect check makes that trial practice; a new
collection is required for independent evidence. Passing requires successful
small, empty, and scattered records without hints or corrective feedback on
those trials. A learner can retry without a penalty or locked navigation.

Progress uses `intuition::<stable lesson id>` regardless of its course or route.
The shared ProgressContext stores assessment stages and evidence in `quizStates`
and records independently demonstrated cases through the shared score API.
It grants `assessment-passed` only on completion. Practise again replays the
questions without overwriting saved completion. Its existing persistence and
signed-in sync apply. Standalone rendering without that provider uses the local
`oc-intuition-progress` store. Neither merely visiting nor using scene controls
counts as passing. This pilot shows its status inside the lesson; curriculum
progress summaries for these experiences remain future integration work.

The rock scene also supports grouping by two, three, five, and ten, counting
whole groups, and identifying leftovers. Its tally record keeps conventional
bundles of five. This grouping exploration introduces remainder, multiplication,
and modulo; the counting pilot does not yet assess those additional concepts.

## Discovery before prescription

Start from a concrete situation with a useful question, not an already-applied
mathematical technique. The learner must be able to investigate without choosing
the technique. In counting, rocks start loose. Ask how long counting takes and
whether keeping your place is difficult. Grouping is an optional experiment: the
learner chooses a size and can ungroup without changing the collection.

Explanations respond to the experiment rather than prescribe the next concept.
Introduce names after the corresponding relationship becomes visible. Do not
claim an arrangement is faster: let learners compare their own counting trials.
The counting timer is ungraded and does not measure grouping construction time;
the app explicitly says it arranges the rocks automatically. Hide the count and
tally record until requested so the answer does not precede the investigation.

Before presenting a new experience, check that the starting state, controls,
feedback, and assessment all preserve these principles. A contributor schema
validates structure; it cannot substitute for this educational review.

## Extending the series

Every experience now declares a concrete starting situation and a transfer
prompt. These prompts are ungraded invitations, not proof of mastery. Only
the counting pilot currently saves assessed understanding. Do not label the
new experiments complete merely because their controls were used.

Use the counting experience as a design example, not as a universal sequence.
The starting state should fit the situation: an unsorted box, an uncut loaf,
an empty record of flips, or a physical object whose movement can be observed.
Optional comparisons preserve the original state; hiding a graph, ungrouping
rocks, or changing an observer does not reset the underlying experiment.

Mental shortcuts should follow visible reasoning. The near-full-tray example
shows why subtracting two missing strips needs a shared-corner correction.
The street example counts complete stretches from one, distinguishes finite
counts from an infinite continuation, and explicitly excludes zero. These
use ordinary arithmetic relationships; they make no claim of ancient origin.
