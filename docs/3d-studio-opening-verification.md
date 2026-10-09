# 3D studio opening implementation

Date: 2026-10-09. Maturity: in development. This is an opening implementation milestone, not a finished game studio or a learner-readiness certification.

## Available path

In Project Studio select **Build a 3D Game Studio — Then Make Games**, then Foundations. The [opening lesson](../src/labs/project-studio/tracks/games3d-foundations/00-your-studio.md) names the audience and destination. Follow the lessons in order in an empty learner folder.

The authored code builds a native C# scene editor with a real 3D camera, a grid and unit cubes. Click an object name to select it; use Left/Right for X, PageDown/PageUp for Y, and Down/Up for Z. Each press edits a quarter unit. The object highlight and inspector read the same scene/session state. Scene IDs survive movement; invalid coordinates and unknown selections are rejected without changing existing state.

The dependency direction is Studio → Core and Checks → Core. No graphics package is needed for rule checks. The project targets net8.0 and pins Raylib-cs 8.1.0. Verification used Windows x64, .NET SDK 9.0.307 with the .NET 8 runtime/targeting packs and the native NVIDIA OpenGL driver. This does not establish portability to other machines or platforms.

The implementation is taught through required edit fragments, not supplied support files. Project Studio derives read-only accumulated references and compares them with the learner's files. Browser reading labels its comparison as a lesson preview, not as a read of local files. The games3d chapters share a learner folder; Circuit Clash stays separate.

## Author checks

[check-games3d-course.mjs](../scripts/check-games3d-course.mjs) reconstructs required edits in a fresh temporary folder and runs the lesson checks at their designated milestones. It isolates CLI configuration and NuGet packages from the user's account. It never writes to a learner's selected project.

It also changes a taught expected result to require a red assertion, then mutates object targeting, identity preservation, overflow validation and failed-selection preservation. Each mutation must fail at its named assertion, not merely fail to compile. Source is restored in finally blocks and the original assertions run again.

Use `node scripts/check-games3d-course.mjs --keep --graphics-smoke` for the complete author check. `--dotnet <path>` selects an SDK executable; `--core-only` explicitly omits graphics builds and must not be reported as complete native verification. With --keep, the printed AUTHOR WORKSPACE is a reviewable copy of the final taught source.

The optional graphics smoke uses test-only bounded-loop instrumentation around the taught app, selects and moves an object through the real session operations, renders frames, captures a screenshot and closes the window. It restores Program.cs and rebuilds afterward. This verifies rendering of the exercised state, not delivery of actual mouse or keyboard input.

## Verification record

- `node scripts/check-games3d-course.mjs --keep --graphics-smoke`: **PASS 16 executed milestones; deliberate assertion failure and 4 rule mutations detected; restored checks pass**, followed by **PASS reconstructed 3D studio opening course**. The native screenshot shows Crate selected at X=2.25, Y=0.50, Z=1.00, with Beacon unchanged. Final taught source was restored and rebuilt successfully. Author workspace: `C:/Users/g4m3r/AppData/Local/Temp/games3d-course-vzoAq4`.
- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/games3d.test.js src/labs/project-studio/series.test.js src/labs/project-studio/lessonQuality.test.js src/labs/project-studio/typedDiffTargets.test.jsx --maxWorkers 1 --testTimeout 15000`: **4 files passed; 17 tests passed**. Covers discovery, maturity, retention of unrelated tracks, shared project grouping, one-file steps, hint/prediction presence, stable unique IDs and accumulated reference construction.
- `node node_modules/vitest/vitest.mjs run src/labs/project-studio --exclude '**/*.desktop.test.js'`: **4 files failed; 36 passed; 10 tests failed; 178 passed**. Failures involved process-tree termination/temporary-folder cleanup, figure rendering and timeouts in command checks and Circuit Clash reconstruction. No full-suite-green claim is made. The failed files are outside this implementation's changes.
- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/circuitClash.test.js src/labs/project-studio/figures.test.jsx src/labs/project-studio/projectChecks.test.js src/labs/project-studio/projectIsolation.test.js --maxWorkers 1 --testTimeout 15000`: **1 file failed; 3 passed; 1 test failed; 37 passed**. Figure, Circuit Clash and command checks passed on this rerun. Process-tree termination and the corresponding EPERM cleanup failure persisted in projectIsolation.test.js; that behavior is outside this milestone and remains unresolved.
- `node src/scripts/build-lesson-titles.js`, `node scripts/build-lesson-ids.mjs`, `node scripts/generate-project-facts.mjs`: regenerated the catalog outputs. The facts generator reported existing catalog problems; details remain in the generated inventory, not copied as a new catalog count here.
- The corresponding commands with `--check`: printed that lesson titles, lesson IDs and project facts are current. `node scripts/audit-project-studio-lessons.mjs --write` followed by `--check` reported an empty structural errors object. Textual signals remain an editorial review queue.
- `node scripts/check-docs.mjs`: **Contributor docs checked: 9 file(s), links, paths and commands all exist.** This check covers its configured contributor documents; it does not certify lesson pedagogy or runtime behavior.
- Browser review: opened the new series in Project Studio; inspected the entry contract, editing lesson, folded code comparison, prediction choices, independent task and progressive hint reveal. Browser execution correctly remained unavailable. No dev server is intended to remain running after review.
- `git -c safe.directory=C:/Users/g4m3r/Documents/open-calc diff --check`: no whitespace errors; Git printed line-ending conversion warnings for existing Windows working-copy files.

The npm launcher in this execution environment points at a missing user-profile npm-cli.js, so Node invoked the underlying scripts and local Vitest executable directly. Initial restricted graphics restore could not reach NuGet; the isolated official-package restore was subsequently authorized and succeeded. An initial screenshot capture used an absolute filename that Raylib did not export as expected; the bounded smoke now uses a filename relative to its author workspace.

## Remaining work

Saving, creation/deletion, undo/redo, text property entry, camera controls, transform gizmos, play mode, behaviors, physics, standalone export and genre projects are not implemented yet. The UI says Not saved yet; restarting loses edits intentionally at this milestone.

Native human input review, keyboard-only selection, accessibility, learner pacing and other platforms remain unverified. The panels currently use a fixed layout and overlay a full-window viewport. The tests establish specific data/session contracts, not the usability of a production editor.

Next build creation/deletion, then reversible editing commands and validated scene persistence. Teach requirements, compatibility, recovery and maintenance as those operations acquire concrete failure modes. Do not jump directly into game simulation before independent edit/play state is taught.
