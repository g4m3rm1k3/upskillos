# Project Studio observation audit — 2026-10-06

Status: the audit itself changed no code. Fixes applied afterwards, on 2026-10-06, are listed in the next section; everything else below remains open.

## Fix status (2026-10-06, after the audit)

The scanner was rerun first: since the audit, 10 steps were added (2422 → 2432), all of them Forge optional challenges, and optional-prose mismatches had grown from 123 to 133.

| Finding | Status | What changed |
| --- | --- | --- |
| AUD-01 | Fixed | One rule, `checksPassed` in `src/labs/project-studio/checkEvidence.js`, now decides both the panel's success state and saved progress: at least one check must actually run, and every check that ran must pass. A run where every check was skipped saves nothing. The audit's stricter proposal (a mix of skipped and passed checks never certifies) was not adopted: all 5 steps using `os=` pair a Windows check with a Mac check, so that rule would have made them impossible to complete on any machine. |
| AUD-02 | Fixed | A failed recheck clears a step's pass. A pass now records the project folder and a fingerprint of the step's checks (`checkRevision` in `checkEvidence.js`), and counts only in that folder while the checks are unchanged. Passes saved before this have no folder and keep counting everywhere, so no progress is lost. |
| AUD-03 | Fixed | Concept bars count only required steps whose checks run the learner's code (`run`, `tests`, `page`). The panel now calls this coverage, not demonstrated mastery. Independent-application assessment is still open. |
| AUD-04 | Fixed | `parseTrack.js` treats a `Challenge` heading as optional when its text opens with a bold **Optional** marker (the Forge format), as well as in typed lessons. Step IDs are unchanged. Rescan: 133 mismatches → 2, both optional side experiments inside required `cpp-game` steps, which are correctly required. The four `Challenge` steps without the marker (ML and spreadsheet tracks) stay required. |
| AUD-05 | Fixed | With no saved position, Studio opens the recommended series' first chapter (`forge-tools`). There is no deep-link route to preserve. |
| AUD-09 | Fixed | The UDP table and closing paragraph in `cpp-networking/01-sockets.md` now cover loss, duplication, reordering and truncation by a short receive buffer, with a sequence-number example. |
| AUD-10 | Fixed | Qualified the ML trees causal claim and stated that the data is simulated, corrected the Python lifetime comparison in `cpp-memory/01-lifetime.md`, replaced "gradients for free" in the lesson body with the actual cost, and softened the boosting popularity claim. The lesson 13.1 title still says "Gradients for Free". |
| AUD-11 | Fixed | `series.js` lists the published `cpp-graphics` and `cpp-engines` chapters; `docs/circuit-clash-course.md` records the .NET/Raylib choice; PySide says it is a one-lesson prototype. A chapter added to the forge-, aml-, cpp- or ml- families no longer inherits the family's audience text: it says its prerequisites haven't been reviewed (`learningProfile.js`). |
| AUD-12 | Fixed | `pr-checks.yml` runs the non-desktop Project Studio suite and checks changed Notebook series lessons in Pyodide (`check_notebook_series.mjs` now takes file paths). Native walkthroughs stay manual; see the platform matrix. |
| AUD-13 | Fixed | A heading can carry its own key, `## Title {#key}`, which takes no number, so inserting a section leaves later step ids alone. No id lock is kept: the curriculum is days old and no learner has saved progress, so lessons can be restructured freely until it is in use. |
| AUD-14 | Fixed (verification still to record) | On macOS and Linux the checker runs `.venv/Scripts/...` from `.venv/bin/`. Four spreadsheet-build checks that existed only for Windows and macOS gained Linux copies. `docs/project-studio-platform-matrix.md` lists each track's requirements and walkthrough; every row says "not recorded" except Circuit Clash, because no clean-machine runs have been recorded. |
| AUD-06 | Partly fixed | All 43 detected tasks were reviewed: most already give requirements and an approach or test ideas, so they were left alone, and cpp-networking's final `say` challenge stays deliberately hint-free. Hint ladders were added to the four with almost no support (palindrome and Money own tests, `/who`, minidb). New required tasks: cpp-engineering steps 8–9 (a `%` operator tests-first on a branch, a self-review list, and the 1.1.0 release) and ml-data's "best value per square foot" transfer task, each with a reference answer and wrong answers in its walkthrough. A complete PySide path is new authoring, not a fix. |
| AUD-07 | Fixed | Remeasured: only 10 steps change more than 40 lines of a file that already existed; the other 117 of the audit's 127 were new or supplied files or cross-file counting. Of the 10, two Forge steps are re-indentation (select and Tab) or a reference answer, one C++ step is mostly the automatic `format` target, and six are guided or deliberate independent tasks (the 4×4 matrix step can't be split: the supplied tests need every function). One was a real code dump: rl-pygame 5.2 "Plan in the window" is now three steps (both methods, arrows, keys), each about 10–15 lines with its own check. |
| AUD-08 | No change needed | Remeasured: 120 code steps have only file or text checks, and all but 11 are run by a behaviour check later in the same lesson. Of those 11, three are git or reference-answer steps, and eight are the Pong court lesson, whose code compiles through the app's bundled C++ runtime (not a compiler a check can call); its authoring test already compiles every step and tests the input and boundary rules. |
| AUD-15 | Open | Needs observation of real learners. |

Verification: `node node_modules/vitest/vitest.mjs run src/labs/project-studio --exclude '**/*.desktop.test.js'`: 33 files, 164 tests passed. Native walkthroughs on Windows 11: `cppEngineering.desktop.test.js` 10 passed, and `mlProduction.desktop.test.js` with `ML_WALKTHROUGH_TRACK=ml-data` 6 passed. Other native walkthroughs were not run.

## Scope and evidence

The source census parsed **359 lessons across 48 tracks**, with 2422 steps and 3509 declared checks, using the shipped parsers. Editorial inspection covered opening material from every track and selected later tasks, chapter handoffs and capstones. Supporting parser, progress, check runner, navigation, companion metadata, test and CI code was inspected. This is not a line-by-line editorial certification of every lesson. Ordinary course lessons outside Project Studio received inventory/context inspection, not a full teaching audit. Repository-wide security, dependency, accessibility and performance certification is also outside this pass.

The non-desktop Project Studio suite passed: 31 files, 151 tests. Command: `node node_modules/vitest/vitest.mjs run src/labs/project-studio --exclude '**/*.desktop.test.js'`. Full native toolchain walkthroughs, clean installation on every OS, GPU/model downloads, Pyodide runtime execution and live browser/desktop visual verification were not rerun. Passing reference-code checks does not establish learner independence.

The structural census found 0 structural findings, 0 unresolved scanned local Markdown links, 0 unresolved named figure exports across 11 references, and 0 unwritten referenced Notebook companions. These are strengths within the scanner's scope, not proof of unrestricted link/render correctness.

## Prioritized fix backlog

Priority means recommended implementation order. P1 affects assessment evidence or teaches a false technical contract; P2 affects learning, navigation or maintenance; P3 requires broader evaluation. All entries are unimplemented.

### AUD-01 — P1: skipped checks can persist as completed work (reproduced)

[desktop/app/project-checks.cjs](../../desktop/app/project-checks.cjs) returns `pass: true, skipped: true` for an OS-filtered check. [src/labs/project-studio/index.jsx](../../src/labs/project-studio/index.jsx) uses `results.every(r => r.pass)` when saving completion; [src/labs/project-studio/LessonPanel.jsx](../../src/labs/project-studio/LessonPanel.jsx) additionally excludes skipped checks when showing success. A read-only probe using the shipped checker returned saved-progress predicate true and visible-panel predicate false for a nonexistent file whose check was skipped. The earlier panel fix did not repair saved evidence.

Proposed fix: use one explicit evidence policy for both saved and displayed results. Distinguish skipped/unverified from passed. Acceptance: skipped-only and mixed skipped/pass batches do not certify completion; real failures remain failures; valid executed checks can pass; reopening preserves the correct state. See [reproduction](project-studio-skipped-check-probe.mjs).

### AUD-02 — P1: completion evidence survives failed rechecks and folder changes (source-confirmed)

[src/labs/project-studio/progress.js](../../src/labs/project-studio/progress.js) stores done flags by step ID in global localStorage, without project-folder or check-revision identity. The normal-step handler in [src/labs/project-studio/index.jsx](../../src/labs/project-studio/index.jsx) marks successful checks done but does not clear prior success after failure. Switching folders can therefore retain badges that describe a different project. This was traced in source, not reproduced through native UI in this pass.

Proposed fix: distinguish historical achievements from current verified project evidence; invalidate current evidence after failed rechecks and bind it to the project and relevant assessment revision. Acceptance: pass then fail, change folder, restart, edit assessed code and change checks all have explicit honest states. Preserve historical progress through a documented migration.

### AUD-03 — P2: concept mastery is inferred from generic checked-step completion

[src/labs/project-studio/mlCurriculum.js](../../src/labs/project-studio/mlCurriculum.js) credits every checked step in a lesson to every declared concept. A file-presence check can contribute to a concept just as a behavioral test can. Proposed fix: label this as checked coverage, or map suitable evidence to concepts and assess independent application before claiming mastery. Acceptance: presence-only, skipped and unrelated checks cannot certify a concept; independent work includes a rationale and rubric.

### AUD-04 — P2: optional prose and assessment status disagree

[src/labs/project-studio/parseTrack.js](../../src/labs/project-studio/parseTrack.js) infers optional status only for typed-pedagogy Challenge headings. The census detected 123 steps described as optional in prose but not parsed as optional, notably Forge extensions. Navigation currently permits moving on; this is a status/accounting mismatch, not evidence of a hard navigation lock. Proposed fix: explicit optional metadata across formats and a defer/revisit state. Review each candidate before changing semantics; preserve published IDs.

### AUD-05 — P2: the recommended entry is not the fresh-profile default

[src/labs/project-studio/index.jsx](../../src/labs/project-studio/index.jsx) selects the first catalog track when there is no saved position. Current ordering selects spreadsheet-build, while [src/labs/project-studio/learningProfile.js](../../src/labs/project-studio/learningProfile.js) recommends Forge for Python scripters. Proposed fix: an explicit path chooser or recommended default. Acceptance: empty profile, existing progress and deep links each select the intended route.

### AUD-06 — P2: independent practice and progressive help need editorial review

Guided full targets and runnable tests are useful scaffolding, but do not demonstrate transfer. Selected ML data lessons finish demonstrations without an independent transfer task; the C++ engineering sequence needs a learner-owned bug/test/release scenario. PySide currently supplies a window prototype rather than a complete developer path. Other ML software and capstone material already includes independent work: retain and assess it.

The scan found 261 task-heading candidates; 183 lack parsed ladders, of which 43 are not explicitly optional by the narrow prose detector. These are review candidates, not 43 proven missing required exercises. C++ own-test tasks deserve early attention. Acceptance: a teaching lesson states a usable outcome, asks for a prediction or diagnosis where appropriate, gives a bounded independent application with progressive help, and distinguishes check coverage from untested behavior. Do not add generic filler or force an exercise into every recap/setup step.

### AUD-07 — P2: authored edit burden and chapter recovery need pacing work

127 non-provided steps change more than 40 nonblank authored target lines. This compares prior targets in the same track/file; it is not the learner's actual edit count and ignores external edits and support-file initialization. Review integration-heavy Forge, C++ graphics/DSA/systems, RL and spreadsheet steps. Chapter starts sometimes recover from required prior exercises through full references, which can reveal solutions early. Proposed fix: smaller explanatory beats inside stable steps, explicit folder handoffs and staged recovery references. Any H2 split requires progress migration first.

### AUD-08 — P2: check evidence needs task-specific limits and counterexamples

453 steps have only file/source inspection checks. Many are legitimate setup checkpoints; this is not a failure count. The shipped run checker also supports stdout substring matching, which can accept extra output and cannot itself exclude hardcoded answers. Proposed fix: state what each assessment proves; use varied inputs, negative cases and deliberately wrong implementations to validate important behavioral checks. Acceptance: a meaningful incorrect solution fails while valid alternative implementations pass; setup checks are described as setup evidence.

### AUD-09 — P1: UDP teaching contract is incorrect

[src/labs/project-studio/tracks/cpp-networking/01-sockets.md](../../src/labs/project-studio/tracks/cpp-networking/01-sockets.md) says each UDP datagram arrives once or never. UDP can duplicate and reorder datagrams. Its claim that each datagram is received whole also needs a receive-buffer truncation caveat. [RFC 8085](https://www.rfc-editor.org/rfc/rfc8085.html) documents the absence of duplicate protection and ordering guarantees. Proposed fix: correct the comparison and give a concrete protocol-handling example; keep demonstrations bounded and testable.

### AUD-10 — P2: qualify model claims and runtime comparisons

The ML trees opening describes settings that cause defects; distinguish predictive association from causal inference and make synthetic ground truth explicit. Review broad boosting popularity/default-choice claims rather than treating them as durable facts. Clarify the memory track's simplified Python lifetime comparison: CPython uses reference counting with cycle collection, and other implementations differ ([Python data model](https://docs.python.org/3/reference/datamodel.html#objects-values-and-types)). Review literal “free” gradient wording against compute cost and differentiation assumptions. Acceptance: examples retain their motivating simplicity while stating the relevant limitation; separately verify niche factual claims before editing.

### AUD-11 — P2: audience, maturity and destination documentation drift

[src/labs/project-studio/series.js](../../src/labs/project-studio/series.js) describes C++ graphics/engine work as planned although those tracks have published lessons. [docs/circuit-clash-course.md](../../docs/circuit-clash-course.md) leaves engine choice unresolved although draft setup selects .NET/Raylib. Broad prefix-based profiles can automatically classify future tracks, and blanket beginner/advanced labels obscure individual prerequisite bridges. Forge, applied ML, spreadsheet and PySide published endpoints are narrower than their destination plans. Proposed fix: a published-versus-planned map and reviewed track-specific prerequisite contracts; do not imply completed paths or tested platforms from file counts.

### AUD-12 — P2: curriculum CI does not cover the same content surfaces

[.github/workflows/pr-checks.yml](../../.github/workflows/pr-checks.yml) scopes lesson schema/LaTeX/Python-cell checks to ordinary `src/courses/**/*.js` files. Lab registry/build checks do not substitute for Project Studio parser/assessment tests or Notebook series runtime validation. Proposed fix: scoped Project Studio inventory freshness and non-desktop tests, plus an appropriate Notebook gate and separate native runtime matrix. Acceptance: a deliberately broken Studio lesson or companion fails the relevant gate without installing every platform toolchain on every PR.

### AUD-13 — P2: structural lesson edits threaten published progress identity

[src/labs/project-studio/parseTrack.js](../../src/labs/project-studio/parseTrack.js) derives step IDs from H2 order. Inserting an H2 reassigns later progress keys; walkthrough fixtures also depend on headings. Proposed fix: stable explicit identifiers and migration design before broad rewrites. Acceptance: existing completed steps still identify the same work after insert/reorder/title edits, and fixtures fail meaningfully when expected behavior changes.

### AUD-14 — P2: execution support needs an explicit platform matrix

Several Python checks use Windows virtual-environment paths; native walkthrough coverage varies by track. C++ toolchain, graphics, Java/Maven, ML dependencies and Circuit draft runtime assumptions need clean-machine verification. Proposed fix: document supported OS/runtime/version, tested date, install steps, smallest success, failure recovery and known skip conditions per track. Acceptance: supported environments run from a clean folder; unsupported checks visibly remain unverified.

### AUD-15 — P3: assess developer decisions with learners

Keyword signals cannot establish professional ability. Evaluate requirements, decomposition, debugging, version control, reproducibility, data validation, interfaces, security, accessibility, collaboration and release/maintenance through suitable tasks. A capstone should require an independently chosen change, justified tradeoff, tests including a failure case, reproducible setup and concise handoff. Observe self-taught scripters attempting entry lessons and a transfer task; record confusion, recovery and unaided success. This pass did not run learner studies.

## Adjacent Notebook inventory

| Series | Written | Planned | Parse failures | Title mismatches |
| --- | ---: | ---: | ---: | ---: |
| python | 24 | 24 | 0 | 0 |
| ml | 74 | 74 | 0 | 0 |
| rl | 2 | 4 | 0 | 0 |
| dsa | 86 | 86 | 0 | 0 |
| math | 84 | 310 | 0 | 0 |

Unwritten planned Notebook lessons are a publication gap, not a broken written companion: all currently referenced Studio Notebook companions exist. Parsing and title alignment were checked; Python cell behavior, visuals and learning quality were not certified.

## Execution order and definition of done

1. Repair AUD-01/02 assessment state and AUD-09 factual contract with focused regression checks.
2. Resolve AUD-03/04/05 evidence language and path selection; design stable progress migration before structural edits.
3. Review every track's prerequisite contract and first independent task using the per-track queue; prioritize recommended-path continuity, then unsupported independent tasks and dense integration steps.
4. Tighten task-specific checks, platform validation and CI; reconcile maturity/destination docs.
5. Run learner observations and assess independent transfer before declaring the entire curriculum developer-ready.

A fix is done when its stated acceptance evidence is recorded, existing progress survives, valid alternative learner solutions work, docs match the shipped behavior and the relevant native/environment check has actually run. A checkbox or text detector alone is insufficient.

## Reproducibility and saved evidence

- [Per-track and per-lesson review queue](project-studio-review-queue.md): every scanned lesson and priority candidate step.
- [Machine-readable observations](project-studio-observations.json): raw metadata and detector signals; generated, do not edit by hand.
- [Read-only scanner](project-studio-observation-scan.mjs): from repository root run `node docs/audits/project-studio-observation-scan.mjs . <temporary-output-directory>`. It writes observation, excerpt and source-hash JSON to the chosen existing output directory; it does not alter lessons.
- [Skipped-check probe](project-studio-skipped-check-probe.mjs): `node docs/audits/project-studio-skipped-check-probe.mjs .`; executes only an OS-skipped file check, without creating project files.
- Existing [quality backlog](../project-studio-lesson-quality-todos.md), [lesson standard](../project-studio-lesson-standard.md) and [initial generated review](../generated/project-studio-lesson-review.md) remain complementary. Their lesson-level regex signals differ from this step-level census; do not add the counts together or infer that a smaller count means fixes were made.

The source snapshot hashes cover Studio, Notebook Lab, desktop app, production scripts and workflows. Final verification compares them after documentation edits. No native runtime or visual evidence should be inferred from this source census.

## Final documentation verification

- Existing inventory freshness check: passed, no structural errors.
- Contributor documentation check: passed.
- New audit/report local file links: verified after correcting the generated-review path.
- SHA-256 comparison of 999 scoped source files: no changes; no added source files in the audited directories.
- Git whitespace check: passed. Git status contains only documentation changes. No commit was created.
