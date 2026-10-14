# Yahtzee in C++ — learning route and verification

The Project Studio series **Scrap · Yahtzee in C++** now starts with **Start here — one file before classes** and ends with **Finish and Explain**. Existing chapter folders and lesson IDs remain unchanged. The series remains in the Scrap section so saved progress and the shared project folder survive.

## Teaching sequence

The opening begins with fixed integer faces and a source/build/run experiment. It introduces const and array bounds, then a pure scoring function and value parameters. Separate scratch programs teach reference aliasing, const references, pointer values versus pointee values, null checks, pointer const placement, valid pointer ranges and borrowing lifetimes. A small single-file Sixes game combines rolling, holding and whole-line input. It is explicitly a prototype rather than full Yahtzee.

A function-only header/source split teaches declarations, definitions, translation units, include guards and linking before the learner sees a class split over files. A class in one file then motivates private state, invariants, constructors, const methods, value semantics and the Rule of Zero. “Module” is defined as an architectural unit here, distinguished from the C++20 language facility.

Existing chapters develop dice, rendering, scoring, turns, rule tables, separate compilation, players, rankings and replay. The completion chapter adds repeated-Yahtzee bonuses and Joker placement, keeps preview read-only, validates before mutation, labels unavailable menu choices and includes each bonus once in player totals. Final faces use a uniform distribution independently of visual tumbling. The release lesson includes a manual play checklist, independent strict-input work and an explanation/transfer rubric.

The opening and completion chapters follow the Forge and Spreadsheet teaching pattern: a story-so-far recap, a concrete build, explanation of the new mechanism, a worked trace or prediction, a controlled experiment, and independent work with progressive hints. Full-file targets let Project Studio display the actual diff; provided test programs are separate steps. Each independent task has executable behavioral checks. The author walkthrough verifies both a correct completion and plausible wrong implementations.

The single-file game grows through whole-line parsing, one roll, a Boolean hold array and a bounded roll loop before it becomes interactive. The header lesson splits that same playable program. The completion chapter grows bonus state, legal placement, scoring and one-time mutation through separate checkpoints, then connects preview, totals and randomness.

Lessons contain prediction fences and independent tasks with progressive hints. They require learner explanations and new cases rather than treating a copied reference as proof of mastery. A terminal game is a substantial foundation, not a claim to cover all of C++.

## Source and author verification

- Lessons: `src/labs/project-studio/scrap/Yahtzee in C++/`.
- Completion support: `07 Finish and Explain/support/tests/` under that folder. The support button supplies behavioral tests, never a replacement game.
- `src/labs/project-studio/yahtzeeCourse.test.js` checks discovery/order, preserved identities, parsing, one target per step, predictions/hints and support resolution.
- `src/labs/project-studio/yahtzeeTeaching.desktop.test.js` walks every parsed opening and completion checkpoint through the real Check my work engine in temporary folders. Correct-answer fixtures and wrong-answer mutations stay outside the app. The completion walkthrough starts from the established chapter snapshots plus prior exercise answers.
- `scripts/check-yahtzee-course.py` reconstructs the final program from published snapshots plus earlier exercise completions, and executes rules, interaction and whole-executable checks in a temporary folder. `CXX` can choose a compiler.
- `src/labs/project-studio/yahtzeeFixtures/exercise-completions.json` contains author-only cumulative answers for APIs introduced by earlier independent exercises. It is not imported by the app. These are the chapter 1 opposite-face task, chapter 4 yes/no parsing, chapter 5 category/best-choice tasks and chapter 6 summary/reset/join-names work. Explicit prose edits such as Ranking.cpp in sources.txt are represented by the final release snapshot.

## Verification on 2026-10-13

Commands and results after the teaching rewrite:

| Command | Result |
|---|---|
| `npx vitest run src/labs/project-studio/yahtzeeTeaching.desktop.test.js` | `Test Files 1 passed (1)`, `Tests 15 passed (15)`. Every opening/completion checkpoint and each exercise's correct/wrong cases use real compilation and execution. |
| `python3 scripts/check-yahtzee-course.py` | Both acceptance suites printed `7 tests ran` and `7 tests` passed. Ended with `PASS: rule and game acceptance; executable replay/EOF/CLI; two rejected mutations.` |
| `npx vitest run src/labs/project-studio --exclude '**/*.desktop.test.js'` | `Test Files 2 failed | 50 passed (52)`, `Tests 2 failed | 239 passed (241)`. The failures remain Git repository detection at projectChecks.test.js:195 and process-tree termination at projectIsolation.test.js:93. Yahtzee structural tests pass, including original step-key preservation. |
| `npx vitest run src/labs/project-studio/yahtzeeCourse.test.js src/labs/project-studio/scrapLoader.test.js` | `Test Files 2 passed (2)`, `Tests 12 passed (12)`. |
| `npm run facts` | Completed; reported existing content problems in the generated inventory. Generated files unchanged. Scrap lessons are not counted as course lessons by this generator. |
| `npm run docs:check` | `Contributor docs checked: 10 file(s), links, paths and commands all exist.` |
| `npm run catalog:check` | Lesson titles, lesson IDs and project facts current; existing content-problem warning remains. |
| `git diff --check` | Exit 0, no output. |

The final rule suite includes exhaustive ordered-hand checks for basic scoring plus focused straight/upper-bonus/Joker cases. Acceptance covers multiplayer completion, replay/reset, EOF, malformed category input, taken categories, roll limits, held dice, empty rankings and ties. The final reconstruction compiles with C++17 and warnings as errors. Random face sequences are deliberately not asserted across libraries.

Browser review confirmed discovery of the rewritten opening, the reference lesson's prediction and code diff, the memory trace, and the independent swap exercise with progressive-hint and behavioral-check controls. The temporary preview server was stopped after review. Browser checks do not run C++; the compiler walkthrough above tests the actual check commands outside the UI.

## Limits

C++ execution was checked on macOS, not Windows or Linux. The final program is reconstructed with author exercise answers; the runner does not certify every intermediate step of the older chapters. Browser reading was reviewed; Electron editor/terminal interaction and animated terminal play still require manual checks. The final acceptance lesson documents that the inherited keep-list parser is permissive and assigns a tested strict-parser improvement as independent work. The broader Project Studio Git/process tests remain failing independently of this content change. No production build was run for this content-only addition.

## First-use review and the separate web series

A follow-up reading found first-use gaps despite passing runtime checks. The setup exercise asked for an entry function before teaching one; it now follows a complete worked greeting with an explanation of each construct and compiler argument. Early provided tests exposed const char* before the pointer lesson; those harnesses now use numbered cases with plain integer parameters, and the first harness explains comparison, bool, void, if, negation, error output, exit status and comments. The input lesson now explains char, stream construction and extraction before using them. The first class setter explains logical-or before its guard.

The compiler walkthrough after these changes printed `Test Files 1 passed (1)` and `Tests 15 passed (15)`. This is evidence that the lesson steps run; it does not certify that every construct in all older chapters has had a complete editorial first-use audit. That broader review remains open.

[Tabletop Workshop](curricula/tabletop-web-series.md) is a separate, standalone beginner series: it teaches the game rules, programming and the web medium from the beginning, then adds Pig and additional games. It does not require this C++ course or any of its files. It is an authoring plan, not a claim that the new course is available. Its first-use ledger and per-milestone runtime, visual and learning-evaluation gates are explicit.
