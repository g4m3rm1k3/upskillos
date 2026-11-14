# Software Engineering course: status and conventions

Read this first when resuming. The curriculum is [software-engineering-curriculum.md](software-engineering-curriculum.md); how lessons are written is [lesson-quality-standard.md](lesson-quality-standard.md); decisions and history are in [agent-architecture-course-audit.md](agent-architecture-course-audit.md).

## Where things live

- **Series:** `swe` in `src/labs/project-studio/series.js`, prefix `swe-`. One chapter (track) per curriculum stage: `swe-s01-ignition`, `swe-s02-…`.
- **Lessons:** `src/labs/project-studio/tracks/swe-sNN-<stage>/SS-MM-LL-<slug>.md`, where `SS` is the stage, `MM` the module and `LL` the lesson within the module, all two digits. Runways use module `00` within the stage that first needs them (`01-00-01-python-runway.md`). The file name is the lesson id and a progress key: never rename or renumber a published lesson.
- **Project folders:** each lesson names its project in frontmatter, `project: swe-kit`, `swe-blockfall`, `swe-ledger`, `swe-framework`, `swe-board`, `swe-machine`, `swe-toylang`, `swe-store`, `swe-netkit`, `swe-renderer`. Project Studio opens that project's own folder (`projectKeyFor` in `series.js`). A concept lesson with no project leaves `project:` out and works in its chapter's folder.
- **Python:** checks and lesson commands write the virtual environment's Python as `.venv/Scripts/python`; on macOS and Linux the checker runs `.venv/bin/python`. Prose shows both.

## Module-to-lesson map (pilot)

Every item in a module's **Covers** line is assigned to a lesson. Pilot modules first; the rest of the map is written before each stage is built.

| Lesson | Teaches (Covers items) | Project increment |
|---|---|---|
| 01-01-01 What a file holds | information vs representation vs meaning; data vs instructions | Kit starts: `count` reports bytes, lines, characters; chooses an encoding |
| 01-01-02 Programs as functions | inputs, outputs, transformations; deterministic vs nondeterministic | Kit: `count` reads standard input; the counting separated from the input and output |
| 01-01-03 What "correct" means | algorithm vs program vs process; levels of a solution; what "correct" means | Kit: `count` gets a written definition of a word, checked against it |
| 01-01-04 Three models of a program | state; a program as a function, a state machine and a process | Kit: `count` streams its input through a word-boundary state machine; exit codes |
| 01-00-01 Python runway | the curriculum's Python runway | Kit: virtual environment, modules, `pytest` |
| 01-04-01 to 01-04-05 | names and objects, identity, aliasing; mutation and rebinding, side effects; copying and where state lives; invariants, encapsulation, value objects vs entities; reading unfamiliar code | Blockfall: the game-state aliasing bug and its fix (01-04-03) |
| 01-09-01 to 01-09-04 | what a test is, evidence vs claims, tautological tests; oracles, edge cases, regression; determinism, isolation, fixtures; red-green-refactor, test levels, over-mocking | Blockfall: rotation and line clearing as tested pure functions; Kit: tests for `count` |

## Pilot

Pilot lessons: 01-01-01 to 01-01-04, the Python runway, 01-04, and the 01-09 Blockfall project lesson. Each gets the three reviews in the standard, including a learner walkthrough by someone who has not seen it, before the rest of a stage is written.

## Status

| Lesson | State |
|---|---|
| 01-01-01 What a file holds | Written 2026-11-14. Code and every stated output run in a scratch folder (Python 3.13, macOS). Not yet: walkthrough test, Windows run, reviews |

## Platform changes made for this course

- 2026-11-14: lesson-level `project:` frontmatter (`parseTrack.js` validates its form; `projectKeyFor` in `series.js`; `index.jsx` resets open files when the folder changes). Tests in `series.test.js`.
