# Yahtzee in C++ — learning route and verification

The Project Studio series **Scrap · Yahtzee in C++** now starts with **Start here — one file before classes** and ends with **Finish and Explain**. Existing chapter folders and lesson IDs remain unchanged. The series remains in the Scrap section so saved progress and the shared project folder survive.

## Teaching sequence

The opening begins with fixed integer faces and a source/build/run experiment. It introduces const and array bounds, then a pure scoring function and value parameters. Separate scratch programs teach reference aliasing, const references, pointer values versus pointee values, null checks, pointer const placement, valid pointer ranges and borrowing lifetimes. A small single-file Sixes game combines rolling, holding and whole-line input. It is explicitly a prototype rather than full Yahtzee.

A function-only header/source split teaches declarations, definitions, translation units, include guards and linking before the learner sees a class split over files. A class in one file then motivates private state, invariants, constructors, const methods, value semantics and the Rule of Zero. “Module” is defined as an architectural unit here, distinguished from the C++20 language facility.

Existing chapters develop dice, rendering, scoring, turns, rule tables, separate compilation, players, rankings and replay. The completion chapter adds repeated-Yahtzee bonuses and Joker placement, keeps preview read-only, validates before mutation, labels unavailable menu choices and includes each bonus once in player totals. Final faces use a uniform distribution independently of visual tumbling. The release lesson includes a manual play checklist, independent strict-input work and an explanation/transfer rubric.

New lessons contain prediction fences and independent tasks with progressive hints. They require learner explanations and new cases rather than treating a copied reference as proof of mastery. A terminal game is a substantial foundation, not a claim to cover all of C++.

## Source and author verification

- Lessons: `src/labs/project-studio/scrap/Yahtzee in C++/`.
- Completion support: `07 Finish and Explain/support/tests/` under that folder. The support button supplies behavioral tests, never a replacement game.
- `src/labs/project-studio/yahtzeeCourse.test.js` checks discovery/order, preserved identities, parsing, one target per step, predictions/hints and support resolution.
- `scripts/check-yahtzee-course.py` compiles introductory targets, reconstructs the final program from published snapshots plus earlier exercise completions, and executes rules, interaction and whole-executable checks in a temporary folder. `CXX` can choose a compiler.
- `src/labs/project-studio/yahtzeeFixtures/exercise-completions.json` contains author-only cumulative answers for APIs introduced by earlier independent exercises. It is not imported by the app. These are the chapter 1 opposite-face task, chapter 4 yes/no parsing, chapter 5 category/best-choice tasks and chapter 6 summary/reset/join-names work. Explicit prose edits such as Ranking.cpp in sources.txt are represented by the final release snapshot.

## Verification on 2026-10-13

`python3 scripts/check-yahtzee-course.py` printed passing rule and game test reports, rejected both injected faults (bonus before rejection and bypassed Joker placement), and ended with:

```text
PASS: 9 introductory programs; rule and game acceptance; executable replay/EOF/CLI; two rejected mutations.
```

The rule suite includes exhaustive ordered-hand checks for basic scoring plus focused straight/upper-bonus/Joker cases. Acceptance covers multiplayer completion, replay/reset, EOF, malformed category input, taken categories, roll limits, held dice, empty rankings and ties. Compilation uses C++17 with warnings as errors. Random face sequences are deliberately not asserted across libraries.

`npx vitest run src/labs/project-studio --exclude '**/*.desktop.test.js'` printed `2 failed | 237 passed (239)` after the new Yahtzee test passed. Failures were the existing Git repository check and process-tree termination check. Rerunning just those two files outside the sandbox printed `1 failed | 21 passed (22)`: process termination passed; Git repository detection still failed at projectChecks.test.js:195. No production Git/process code was changed for this course.

`npx vitest run src/labs/project-studio/yahtzeeCourse.test.js src/labs/project-studio/scrapLoader.test.js` printed `2 passed (2)` test files and `10 passed (10)` tests. `git diff --check` finished successfully with no output.

`npm run docs:check` printed `Contributor docs checked: 10 file(s), links, paths and commands all exist.` `npm run catalog:check` reported lesson titles, lesson ID map and project facts current, with the existing content-problem warning.

`npm run facts` completed and reported existing content problems in the generated inventory. The generated files did not change. This generator does not count Scrap lessons as course lessons.

Browser review opened the actual Project Studio window and confirmed the new opening selected in the Yahtzee series, the new chapters/lessons in the selectors, and the pointer lesson's code, prediction control, const comparison table and progressive-hint exercise. The final chapter and its acceptance-test step also rendered correctly. The temporary Vite server was stopped after review.

## Limits

C++ execution was checked on macOS, not Windows or Linux. The final program is reconstructed with author exercise answers; the runner does not certify every intermediate step of the older chapters. Browser reading was reviewed; Electron editor/terminal interaction and animated terminal play still require manual checks. The final acceptance lesson documents that the inherited keep-list parser is permissive and assigns a tested strict-parser improvement as independent work. Broad Project Studio Git detection remains failing independently of this change. No production build was run for this content-only addition.
