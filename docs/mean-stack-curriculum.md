# MEAN Stack — a task board designed from its data

Status: in development. The authored lessons cover the first application milestone, not the complete MEAN curriculum. The [required mastery scope](mean-stack-mastery-scope.md) audits coverage from JavaScript through production operations and specifies independent evidence. Advanced stages remain required but unauthored; editorial pacing, learner sessions and Desktop UI review remain open. Find the series in Project Studio as **MEAN Stack — Build a Task Board with Database Design**. All chapters share one learner folder.

## Entry and learning rhythm

Designed for a learner who knows basic JavaScript and needs practice. The opening lesson rehearses objects, array methods, modules, errors and async/await, then grades an independent summary function against empty, mixed and completed inputs and mutation checks. Basic HTML is helpful. Database design, Express and introductory Angular/TypeScript are taught here. Use Node 22.22.3+ in the Node 22 line or Node 24, npm and local MongoDB Community 8. Project Studio Desktop runs file and command checks; the web app is a reading surface for this series.

Work one lesson at a time. Predict before running, observe the actual result, explain any difference, then attempt the independent task without copying a solution. Keep an evidence folder with inputs, outputs, explanations and a new test. A file-existence check only records submission. Do not use green checks as proof of understanding.

If a step feels opaque, stop at its first new term and trace a concrete value. The HTTP warm-up and Angular counter deliberately run before their integrated versions. The query workshop makes duplication observable before asking the learner to defend a schema.

## Path and exit questions

| Chapter | Work | Explain before continuing |
|---|---|---|
| Requirements and Node | Input rules, identity/copying, closures, async ordering/cancellation, tests and request map | Why must validation exist outside the browser? |
| Database design | Access patterns, cardinality, references, embedding, snapshots, normalization and model invariants | Which value is authoritative, and what can grow without bound? |
| MongoDB | Connection, collection validation, unique and compound indexes, explain | Which rule is enforced in storage, and which remains application-owned? |
| Express | One-request warm-up, creation, bounded pages and versioned edits | Why can only one stale writer succeed? |
| Angular | Counter warm-up, TypeScript, signals, forms, HTTP and visible failure states | Which state is in memory and which survives a restart? |
| Quality and evolution | Real MongoDB/HTTP regressions, repeatable migration and capstone | How will old readers and writers coexist during a schema change? |

The first runnable win is a dependency-free array experiment, followed by modules and a simulated async load. The first independent task implements a summary function against a supplied behavioral checker. The first abstraction jump is from one input rule to the client/API/storage boundaries. Later independent design tasks ask for acceptance cases and boundary tests. The capstone adds priority through every layer with compatibility and failure evidence.

## Scope

The guided app creates and lists tasks for one seeded project and changes their status. It is a loopback-only, single-operator prototype. Project deletion is deliberately absent, so orphan policy and deletion races can be reasoned about before implementation. There is no authentication claim. Accounts, multi-project authorization, transactions across records, backup/restore and deployment are required later stages of the expanded course, not optional coverage. Their full lessons are not yet authored.

The MongoDB driver is used directly so schema validation, identifiers, indexes and atomic predicates remain visible. An ODM comparison belongs after these mechanisms are understood. The Angular client has a development proxy; GitHub Pages alone cannot host the API or database. Full TypeScript, Angular routing/reactive forms/RxJS, security, testing architecture and operational practice are tracked explicitly in the mastery scope.

## Verification and review

- `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"` checks Project Studio integration.
- `node scripts/verify-mean-stack.mjs --angular` reconstructs guided targets into a temporary folder, scaffolds Angular 21, builds both client stages, runs real HTTP/MongoDB tests and a migration experiment. It requires a local MongoDB and package downloads. Set MONGO_URL for a dedicated local instance. It uses uniquely named scratch databases and cleans them up. `--keep` retains the generated project for browser review.
- Add `--browser` to exercise creation, completion, a two-tab edit conflict and recovery in Playwright Chromium. The author runner also removes the version guard temporarily and verifies that the integration test rejects that mistake before restoring the file.
- `node scripts/audit-project-studio-lessons.mjs --write` regenerates the structural review inventory. Signals are a human review queue, not a teaching score.

Manual review must cover the rendered lessons, hints, keyboard navigation, two-tab conflict handling, failed API requests and persistence across a server restart. Do not mark the series ready until a learner can complete and explain the transfer exercises independently.

Primary references are linked beside the relevant lesson: Angular compatibility and setup, Express 5, MongoDB embedding, validation, compound indexes and atomic writes.

## Recorded verification — October 14–15, 2026

Windows, Node 24.12.0 and a temporary MongoDB 8.3 instance were used. The suggested Node 22 line was not separately exercised. The temporary API, Angular preview and MongoDB processes were stopped after verification.

| Command | Observed output/result |
|---|---|
| `node scripts/verify-mean-stack.mjs --angular --browser --keep` | Both Angular builds completed; `pass 9`, `fail 0`; `Migration is repeatable`; `Mutation check passed: missing version guard is rejected.` Browser passed empty state, keyboard creation, completion, two-tab conflict, API outage and persistence after restart. The proxy logged the expected ECONNREFUSED during the deliberate outage. The final browser screenshot was inspected. |
| `node scripts/verify-mean-stack.mjs` after the JavaScript practice addition | Array, module and async examples printed the expected results; `pass 9`, `fail 0`; migration and missing-version-guard checks passed; `MEAN guided reconstruction passed.` |
| `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"` | `Test Files 1 failed \| 53 passed (54)` and `Tests 236 passed (236)`. The new MEAN contracts and practice-grader wrong answers passed. Existing `frontierLint.test.js` failed to import with `SyntaxError: Invalid or unexpected token`; its files were not changed. |
| `npm run facts` and `npm run catalog:check` | Generated facts successfully; `Lesson titles are current`, `Lesson id map is current`, `Project facts are current`. Both reported existing content problems; see the generated [inventory](generated/project-inventory.md). |
| `npm run docs:check` | `Contributor docs checked: 10 file(s), links, paths and commands all exist.` |
| `node scripts/audit-project-studio-lessons.mjs --write` | Regenerated review reports. Existing `independent task exposes full target` errors remain in the Electron and spreadsheet tracks; no MEAN structural error. Textual review signals are not a quality certification. |
| `git diff --check` | No whitespace errors; Git emitted LF/CRLF notices for generated and pre-existing changed files. |

The first sandboxed test attempt could not rename Vite temporary files, and its package download could not resolve npmjs.org. The successful checks above ran with the necessary sandbox escalation. Human teaching review and rendered Project Studio Desktop review remain open.

## Depth expansion verification — October 15, 2026

Added lessons on identity/closures, async ordering/cancellation, dependencies/normalization/model invariants, and a learner-facing mastery checkpoint. Existing lesson paths and step ids were preserved. No advanced-stage implementation is implied by the coverage document.

- `node scripts/verify-mean-stack.mjs`: all authored demonstrations ran; `tests 17`, `pass 17`, `fail 0`; `Migration is repeatable`; `Mutation check passed: missing version guard is rejected.` The runner now prints that its coverage is the authored first-app milestone only. Temporary MongoDB was stopped afterward.
- `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"`: `Test Files 1 failed | 53 passed (54)` and `Tests 236 passed (236)`. The unchanged Frontier import failure remains `SyntaxError: Invalid or unexpected token`.
- `node scripts/audit-project-studio-lessons.mjs --write`: regenerated the review inventory; the same existing independent-task errors remain outside MEAN. The new lessons have no structural errors.
- `npm run facts` and `npm run catalog:check`: generated and confirmed current title/id maps and project facts; existing content warnings remain in the generated inventory.
- `npm run docs:check`: `Contributor docs checked: 10 file(s), links, paths and commands all exist.`

The Angular runtime was not changed, so its previously recorded browser/build checks were not repeated. Rendered teaching review and independent learner review remain open.
