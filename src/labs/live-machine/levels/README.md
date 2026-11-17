# Live Machine levels

Every `.json` file in this folder is a level. Drop a file in and it appears on the star map,
sorted by `season`, then `order`. Nothing else needs registering. Then run
`npx vitest run src/labs/live-machine`: it checks every level (see "What the tests check").

Copy `s0-01-lights.json` to start. The plan with all seasons is `docs/live-machine-plan.md`.

## Two rules for every level

1. **Every rule comes from a problem the learner can see.** Before a step asks for new code, the
   ship must already be visibly going wrong with the code from the step before: a gauge in the
   top bar, a line in the ship log, something on the ship itself. The step's text points at it.
   Never "the captain orders X"; show why X matters. `worlds/worlds.test.js` runs each world on
   each step's code and checks the problem really appears.
2. **Every check explains itself.** Give each case a `why`: one short sentence saying why that
   answer is right. Learners see it when a check fails.

## Fields

| Field | Meaning |
|---|---|
| `id` | Progress key. Unique, and **never changed** once published. |
| `season`, `seasonTitle`, `order` | Where it sits on the star map. |
| `title`, `tagline` | Shown at the top of the mission panel. |
| `language` | `"javascript"` or `"typescript"`. |
| `world` | Which simulation runs: a key of `worlds/index.js` (e.g. `"lights"`). |
| `file` | Name shown above the editor, without extension (e.g. `"ship/lighting"`). |
| `entry` | The function the ship calls. Its arguments come from the world's `inputs()`. |
| `briefing` | Paragraphs: the story and the problem. Shown on first visit and in the panel. |
| `starter` | Starting code. An array of lines (easier to read in JSON) or one string. |
| `steps` | The small pieces, in order (below). |
| `check` | `{ text, cases }`: the hidden ship check that completes the level. |
| `solution` | A full working answer. Used only by the tests; never shown. |
| `concepts` | Shown when the level is complete. |

A step:

| Field | Meaning |
|---|---|
| `id`, `title` | `id` unique within the level. |
| `text` | Paragraphs explaining the idea *before* the learner writes it. |
| `predict` | Optional `{ question, options, answer, explain }`. `answer` is an index into `options`. The goal appears only after the learner predicts. |
| `goal` | `{ text, cases }`: checked every time the code goes live. The step is done when every case passes. |
| `hints` | A ladder: a question, then a nudge, then the line itself. |
| `code` | The few lines this step adds. Shown only after every hint, as a last resort. |

A case is `{ "label": "...", "why": "...", "args": [ ... ], "expect": value }`. `args` is the list
of arguments passed to `entry`; `expect` is compared by value (objects and arrays deeply). Add
`"unordered": true` when the answer is an array whose order doesn't matter.

Text supports `` `code` ``, `**bold**` and `*italic*`.

## Ship check

The ship check stays locked until every step is done.

## What the tests check

For every level: the file is valid; the solution compiles and passes the last step's goal and the
ship check; the starting code compiles but fails the ship check; no step's goal is already met by
the starting code; and the world runs 300 ticks on the solution.

## A new kind of system

A level that needs a new simulation needs a world: a pure module in `worlds/` (`create`,
`inputs`, `advance`, `stats`; see `worlds/lights.js`), added to `worlds/index.js`, and a picture
plus inspector text in `worlds/views.js`. The ship's shared parts (rooms, crew, alarms, course,
the log, "last 30 seconds" counters) are in `worlds/ship.js`; the hull drawing is
`worlds/ShipFrame.jsx`. Gauges for mistakes should count recent events (`recentCount`), not
running totals, so they fall back to zero once the learner's fix works. Add a test to
`worlds/worlds.test.js` that each step's code shows the problem the next step fixes.
