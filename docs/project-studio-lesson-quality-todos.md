# Project Studio lesson quality todos

Status: structural verification and initial repairs completed 2026-10-06; full teaching review remains open.

Use the generated [per-lesson review inventory](generated/project-studio-lesson-review.md) and [machine-readable findings](generated/project-studio-lesson-review.json), regenerated with `node scripts/audit-project-studio-lessons.mjs --write`. The [Project Studio standard](project-studio-lesson-standard.md) defines the evidence needed before calling a lesson ready. Signals are heuristics; no lesson is certified by this scan.

This document tracks the follow-up pass for Project Studio lessons. The target learner is a self-taught Python scripter, not a software engineer, game developer, C++ developer, Java developer or machine-learning practitioner.

## Audience contract

A Project Studio lesson is ready for this learner when it:

- Starts from Python-script mental models: files, variables, functions, lists, loops, dictionaries, `if`, `print`, and running a `.py` file.
- Defines each new tool, term and symbol before using it.
- Introduces one new abstraction at a time.
- Gives the learner a concrete problem before naming a professional pattern or framework.
- Includes predict, observe and explain moments.
- Keeps guided edits small enough to understand, not merely type.
- Ends with independent work that has requirements, checks and progressive hints.
- Says exactly what automated checks prove and what they do not prove.
- Avoids implying that reading, running, or matching a diff proves mastery.

## Triage buckets

Use these buckets during the next pass.

### Ready for Python scripters

These tracks look closest to the audience contract. Still review individual lessons before declaring them done.

- `forge-*`
- `dice-path-start`
- `dice-cpp`
- `aml-python`
- `aml-project`
- Early `ml-software`
- Early `spreadsheet-build`

### Needs bridge lessons or slower opening

These tracks contain useful material but should be checked for missing prerequisites, too much setup, or professional framing too early.

- Later `ml-*` production tracks
- `rl-pygame`
- `java-engineering`
- `spreadsheet-build` after the terminal/setup chapters
- `cpp-foundations`
- `cpp-language-basics`

### Advanced or parked for now

These may be good technical tracks, but they are probably not first-path material for the target learner without substantial bridge work.

- `cpp-memory`
- `cpp-classes`
- `cpp-generic`
- `cpp-dsa`
- `cpp-engineering`
- `cpp-systems`
- `cpp-networking`
- `cpp-graphics`
- `cpp-engines`
- `circuit-clash`
- `pyside6-engine`

## Todo checklist

- [x] Add a short audience note to every series selector entry: who it is for, what it assumes, and whether it is beginner, bridge or advanced.
- [x] Mark unfinished or preview-only tracks clearly in the Project Studio UI, especially `circuit-clash`.
- [x] Decide the primary recommended path for self-taught Python scripters.
- [x] Decide which older accelerated tracks should remain visible by default.
- [x] Add a machine-readable track maturity field if the UI needs filtering later.
- [ ] Audit first lessons first; if lesson 1 is too steep, later lessons do not matter yet.
- [ ] For each track, write a one-paragraph prerequisite contract in the first lesson.
- [ ] For each track, identify the first point where the learner is expected to design independently.
- [ ] Ensure every required independent task has progressive hints.
- [ ] Separate optional challenge code from required learning code.
- [x] Check that "no code is given" steps do not show the full solution in the same visible step unless the UI hides it as an optional reference.
- [ ] Add prediction moments to tracks that mostly lecture or demonstrate.
- [ ] Add recovery links or review notes when a lesson depends on an earlier idea.
- [ ] Replace professional shorthand with concrete examples where it appears before the learner has a reason for it.
- [ ] Confirm every setup-heavy lesson gives a small win before a large toolchain install, where possible.
- [ ] Confirm each lesson says what checks prove and what remains untested.

## Specific findings to revisit

- `cpp-language-basics/01-values-and-input.md`: verified that `reference: optional` already hides the full target in the UI. Reworded the exercise to make this explicit; added progressive hints, learner-selected cases and check limits. Corrected the negative integer-division comparison with Python. The multiplication-table challenge now also has progressive hints and clear coverage limits.
- `java-engineering/00-start.md`: now starts its first teaching step with a JDK-only print experiment, prediction and recovery instructions before architecture. Full project tool installation is deferred until after this win. Existing lesson and step ids are preserved. Later lessons still need review.
- `circuit-clash/00-play-the-game.md` and `circuit-clash/01-tools-and-first-run.md`: the unpublished claim was stale and is corrected to draft implementation lessons available. Verification found that the first implementation lesson already teaches a one-line console program and diagnostic experiments; the broad game features are a destination summary. Added progressive support and coverage limits to its independent exercise. Full learning and cross-platform verification remain open.
- Older `cpp-*` tracks: Many appear structurally runnable but lack hint ladders and have dense advanced terminology. Decide whether to retrofit them for the target learner or classify them as advanced.
- `spreadsheet-build`: The early terminal material fits the learner well, but the track should be checked for prediction/hint support after the setup chapters.
- Later `ml-*` tracks: Good project motivation, but some topics may need bridge lessons from applied-ML basics before production vocabulary appears.

## Review template

Use this for each track.

```text
Track:
Audience bucket:
Assumed prerequisites:
First learner win:
First major abstraction jump:
First independent task:
Does it have progressive hints?
Does it define new vocabulary before use?
Does it explain what checks prove?
Recommended action:
```

## Initial audit notes

The first structural scan covered 359 Project Studio markdown lessons. It found a strong split: newer Forge and Dice-start material is written directly for self-taught Python scripters, while several older C++/Java/Circuit tracks are useful but front-load professional vocabulary, toolchains or architecture. This document is the saved backlog for turning that observation into actionable edits.

## Verified decisions and remaining scope

Forge is the recommended entry path for Python scripters. Existing advanced tracks remain visible with audience and maturity labels; nothing is hidden or renumbered. No track is automatically certified as ready. The shared check panel explains source, file, command, test, browser and Git evidence and labels success as listed checks passed. Skipped checks cannot claim that success. Lesson-specific limitations still need editorial work.

The generated inventory covers every direct track Markdown lesson and records the first detected independent task per track. Support files are excluded. A task under an unfamiliar heading may be missed, and a task or prediction that is detected may still be inadequate. Review those signals against the actual prose, not by adding filler to satisfy text matching.

Five lessons with independent-task headings and visible full targets now use optional references. Their code and progress ids are unchanged. Other gaps remain explicitly open; this initial repair does not establish that all lessons meet the audience contract.

## Verification of this repair

- `node scripts/audit-project-studio-lessons.mjs --write` and `--check`: generated reports match the catalog; output reports an empty structural-errors object. Review signals remain open in the generated report.
- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/lessonQuality.test.js src/labs/project-studio/series.test.js src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/StudioNavigation.test.jsx src/labs/project-studio/javaEngineering.test.js src/labs/project-studio/circuitClash.test.js src/labs/project-studio/diceCpp.test.js src/labs/project-studio/hints.test.jsx src/labs/project-studio/predictions.test.js src/labs/project-studio/progress.test.jsx`: 10 test files passed, 40 tests passed.
- After refining skipped-row markers, reran `LessonPanel.test.jsx` and `lessonQuality.test.js`: 2 test files passed, 12 tests passed.
- The native `cppLanguageBasics.desktop.test.js` walkthrough completed successfully in the initial mixed run, using the real compiler and CMake. That mixed run reported 5 files passed, 1 file failed, 28 tests passed and 1 failed: its failure was the new evidence helper receiving a test fixture without a check kind. The helper was corrected and the UI suite passed in both later runs above. No learner target code was changed during these repairs.
- `node scripts/check-docs.mjs`: Contributor docs checked: 9 files, links, paths and commands all exist.
- `git -c safe.directory=C:/Users/g4m3r/Documents/open-calc diff --check`: no whitespace errors.

These checks establish parser, navigation, assessment UI and reference-program behavior. They do not certify every lesson's explanation, prerequisite sequence, independent task or effectiveness with learners. No full production build or live browser inspection was run in this pass.
## Broader observation audit — 2026-10-06

See the [full audit](audits/project-studio-full-audit-2026-10-06.md) and [all-track review queue](audits/project-studio-review-queue.md). This pass only changes documentation. The earlier statement that skipped checks cannot claim success applies to the visible panel; AUD-01 reproduces a separate saved-progress defect that remains open. Saved completion after failed rechecks/folder changes also remains open. Existing checked items describe the initial repair and do not certify all lessons.

- [ ] Repair saved skipped/stale evidence (AUD-01/02).
- [ ] Correct UDP guarantees (AUD-09).
- [ ] Align concept coverage language, optional state and recommended entry (AUD-03/04/05).
- [ ] Complete per-track prerequisite and independent-task review, then per-lesson editorial verification (AUD-06/07/08).
- [ ] Reconcile maturity/docs, progress identity, platform support and CI (AUD-11/12/13/14).
- [ ] Verify technical qualifiers and observe independent learner transfer (AUD-10/15).
