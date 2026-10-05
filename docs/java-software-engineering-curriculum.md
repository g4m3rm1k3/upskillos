# Software Engineering with Java — Common Ground

A Project Studio course for self-taught scripters, graduates and learners moving from assembling code to owning a system. Java is the primary language; HTML, CSS, JavaScript, TypeScript, React, Spring Boot and SQL make the full application visible. The central project is Common Ground, a shared task workspace with persistent tasks, discussion, authenticated roles and conflict-aware updates.

The course is discovered from `src/labs/project-studio/tracks/java-engineering/`. It appears as **Software Engineering with Java — Common Ground** in Project Studio's Series selector. It uses one project folder throughout. It is not a separate lesson catalog course under `src/courses/`.

## Non-negotiable teaching rules

- Learners type every project file. No supplied source bundles, starter creation buttons, full-file reference dumps, or generated solutions.
- Code appears in small fragments with technical explanations of execution, syntax, data flow and design choices. Analogies may supplement those explanations, never substitute for them.
- Teach underlying behavior before introducing a framework that automates it. Reuse maintained libraries rather than rebuilding frameworks for their own sake.
- Specify behavior, observe a meaningful failure, implement and refactor. Include deliberately weak tests, planted regressions and realistic failure boundaries.
- Treat design decisions as contingent on requirements, workload and evidence. Explain rejected alternatives and triggers for revisiting a choice.
- There is no agent section. Agent-assisted engineering is outside this course.
- Challenges never block navigation and are not prerequisites for subsequent code. Covered material, automated check results and deferred practice are separate records. Open-ended review is not automatically marked passed.

## Explanation standard and editorial review

The reference lessons are [Pygame’s window and loop](../src/labs/project-studio/tracks/rl-pygame/00-03-a-window-and-a-loop.md), [its Q-table representation](../src/labs/project-studio/tracks/rl-pygame/01-01-the-shape-of-a-q-table.md), and [the PySide6 editor’s first window](../src/labs/project-studio/tracks/pyside6-engine/01-a-window.md). Follow their causal explanations and concrete experiments, while preserving this course's requirement that learners type all source themselves.

The initial Java course named many constructs without teaching their execution. The revision introduces prerequisite syntax before challenges and explains callbacks, references, state and boundaries at their point of use. It adds traces, prediction checkpoints, deliberate break-and-restore experiments, and comparisons that identify when a design should change. Existing lesson and step progress keys, typed source fragments and challenge independence remain intact.

Review every newly introduced construct against these questions:

1. What concrete problem makes this operation necessary?
2. What do its tokens and argument positions mean? Which earlier explanation supplies any assumed knowledge?
3. Who invokes it, when does it execute, what values flow through it, and what state changes?
4. What would happen if it were omitted, reordered or replaced with a plausible wrong alternative?
5. Can a learner predict a small example, inspect the result, and explain a different case?
6. What does the test establish, and which nearby failure could still escape it?

The review covers Java execution and tests; repository/build mechanics; records, collections and graph loops; HTML/CSS/DOM behavior; HTTP and Spring construction; JDBC, transactions and streams; TypeScript/React lifecycles; security and test doubles; concurrency, search, migration, diagnostics and release ordering. Independent work includes worked requirement analysis without providing its implementation.

Automated checks validate parsing, fragment reconstruction and selected product behavior. A minimum prose length does not establish explanation quality and is not used as an editorial pass criterion. These revisions still need learner observation to assess pacing, retention and independent transfer; passing the executable walkthrough does not certify those outcomes.

The [series completion review](java-software-engineering-series-review.md) maps every lesson to its explanation coverage and observable evidence. The completion pass also removes required instruction from optional practice and finishes release/recovery, independent review and handoff procedures.

## Learning progression

| Stage | Work and evidence |
|---|---|
| Execution and repository literacy | Trace real Java, distinguish compiler and runtime failures, use Git's working tree/index/history, resolve conflicts and recover |
| Behavior and domain modeling | Maven/JUnit, red–green–refactor, string boundaries, immutable records, identity, state transitions and explicit errors |
| Collections and design | Generic collections, loops, graph dependency planning, snapshots, storage contracts, complexity and test weaknesses |
| Browser fundamentals | Semantic HTML, CSS layout and focus, DOM events, JavaScript state and safe text rendering |
| HTTP and backend framework | Inspect a JDK server, define an HTTP contract, then use Spring's mapping, injection and JSON handling |
| Persistence and concurrency | SQL/JDBC, constraints, atomic update plus audit, optimistic revisions, deterministic failure injection and competing workers |
| Frontend framework | Manually configure Vite/TypeScript, React state/effects, accessible forms, loading/error recovery and versioned mutations |
| Identity and collaboration | Session authentication, CSRF, role enforcement, server-owned comment attribution and an integrated discussion UI |
| Growth and operations | Bounded search, query tradeoffs, additive migration experiment, retry semantics, diagnostics, CI and packaged release |
| Independent engineering | Scope a change, test it, produce a reviewable diff, investigate an incident and explain transfer across languages/tools |

## Implemented product versus design exercises

The guided implementation runs locally with a JDK, Maven and Node. It builds an executable Spring Boot archive serving a React interface. Tasks and comments live in H2; writes use SQL parameters, task transitions use optimistic revisions, and audit insertion shares the update transaction. The local identity provider provisions an editor from external configuration; integration tests exercise viewer denial too. Search is available through a bounded API; the board displays its first page explicitly.

The dependency planner and retry policy are independently tested utilities, not integrated background scheduling features. The description migration is a tested artifact, not an automatically deployed feature. PostgreSQL deployment, a durable outbox, a full search UI, multiple projects, invitations, attachments and real-time delivery are discussed as further work rather than represented as implemented. This distinction is taught in the final review.

The course does not claim to replace a decade of practice. It provides a substantial, explainable application and a path for acquiring and assessing transferable engineering skills. The open-ended milestone requires human review; file-existence checks only confirm evidence artifacts exist.

## Project Studio integration

`pedagogy: typed` opts into covered-material tracking and the optional challenge list. Only opted-in lessons interpret `## Challenge — ...` headings as optional, preserving existing curricula's semantics.

A fence such as `java edit=src/main/java/workspace/Task.java mode=append` opens the learner's file while leaving the fragment in the explanatory prose. It never supplies a whole-file target, pre-fills an editor or writes code. `mode=replace` explicitly describes a small revision. One edit fence per step is enforced. Larger modifications are explained as focused insertions or removals.

`progress.js` retains the existing storage key and old checked progress, adding covered steps and challenge states. Failed challenge checks revoke an earlier passed state. Deferral does not certify correctness. All lesson navigation remains available in browser mode, where execution is done in the learner's own tools.

## Verification

Run the structural and interaction checks:

```sh
npx vitest run src/labs/project-studio/javaEngineering.test.js src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/progress.test.jsx src/labs/project-studio/StudioNavigation.test.jsx src/labs/project-studio/series.test.js
```

Run the opt-in real Java walkthrough with an existing Maven installation:

```sh
JAVA_COURSE_MAVEN=/absolute/path/to/mvn npx vitest run src/labs/project-studio/javaEngineering.desktop.test.js
```

Optionally set `JAVA_COURSE_REPOSITORY` to a temporary Maven cache. The walkthrough reconstructs fragments and the explicitly taught file moves/insertions in a temporary directory, verifies the intended red failure and subsequent Java milestones, and plants regressions that the learner-authored tests must reject. It never supplies this reconstructed source to learners. Frontend dependencies/build and packaged browser smoke testing are separate verification steps.

Official references: [Java 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/), [Maven installation](https://maven.apache.org/install.html), [Spring Boot requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [React fundamentals](https://react.dev/learn), [Vite guide](https://vite.dev/guide/), [H2 tutorial](https://h2database.com/html/tutorial.html). Pinned teaching versions support reproducibility, not a claim of perpetual security or latest-version status.

### Explanation revision verification — 2026-10-04

Commands run after the revision:

```sh
npx vitest run src/labs/project-studio/javaEngineering.test.js src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/progress.test.jsx src/labs/project-studio/StudioNavigation.test.jsx src/labs/project-studio/series.test.js
```

Printed `Test Files 5 passed (5)` and `Tests 18 passed (18)`.

```sh
JAVA_COURSE_MAVEN=/tmp/apache-maven-3.9.11/bin/mvn JAVA_COURSE_REPOSITORY=/tmp/java-course-m2 npx vitest run src/labs/project-studio/javaEngineering.desktop.test.js
```

Printed `Test Files 1 passed (1)` and `Tests 2 passed (2)`. This replays Java milestones, including intended behavioral red, and verifies planted title, transaction and authorization regressions are rejected. The temporary tool/cache paths reflect this local verification environment, not required learner paths.

```sh
npm run docs:check
git diff --check
```

The documentation check printed `✓ Contributor docs checked: 9 file(s), links, paths and commands all exist.` The whitespace check printed nothing and exited successfully. Vite/Vitest also printed existing toolchain deprecation, browser-data age and uncached Pyodide-package notices; the selected checks completed successfully.

A read-only comparison with HEAD confirmed unchanged step ids, headings, typed source fragments, checks and optional flags. New prediction fences parsed successfully. A local browser inspection confirmed the execution explanation and table render, submitting a prediction reveals its explanation, and Next remains available. The temporary preview was stopped afterward. No full UpSkillOS production build was run for these teaching-content edits; the frontend implementation was unchanged.

### Guided-series completion verification — 2026-10-05

The completion review covers every discovered lesson. Existing lesson/step ids and ordering were preserved; the recovery-feedback test was appended as a new step. A real browser check exposed an obsolete conflict message after successful refresh. The taught Board refresh now sets Ready after the accepted read, and the frontend lesson tests that recovery while retaining an unsaved draft.

The focused Studio command listed above printed `Test Files 5 passed (5)` and `Tests 18 passed (18)`. The real Java walkthrough printed `Test Files 1 passed (1)` and `Tests 2 passed (2)` during the completion pass. Subsequent code changes were confined to the frontend recovery behavior and its test.

A fresh application was reconstructed from the authored fragments in `/private/tmp/common-ground-9G2Lvr`. Its frontend was verified with:

```sh
# From the reconstructed application's frontend directory:
npm install --cache /private/tmp/common-ground-npm-cache --no-audit --no-fund
npm ci --cache /private/tmp/common-ground-npm-cache --offline --no-audit --no-fund
npm test
npm run build
```

Clean installation succeeded. The final component run printed `Test Files 1 passed (1)` and `Tests 3 passed (3)`. The production build typechecked successfully and printed `31 modules transformed` and `built in 1m 55s`. An initially copied temporary lockfile contained invalid local links and failed clean installation; generating a fresh lockfile in the canonical project directory resolved the verification setup issue. A whatwg-encoding deprecation warning remained.

A disposable mutation removed refresh's Ready update and ran `npm test -- -t 'clears stale feedback'`. It produced the expected failing recovery test (`1 failed, 2 skipped`); the unmodified source passes. No learner source is generated by the UI; reconstruction is author verification only.

From the reconstructed application root:

```sh
/tmp/apache-maven-3.9.11/bin/mvn -B -ntp -o -Dmaven.repo.local=/tmp/java-course-m2 verify
```

The final package printed `Tests run: 19, Failures: 0, Errors: 0, Skipped: 0` and `BUILD SUCCESS`. The JAR includes the built frontend. `npm run docs:check` printed its successful contributor-link/path/command result; `git diff --check` exited successfully without output. The full UpSkillOS production build was not run for this content-focused change.

The packaged JAR was started on loopback port 8097 with a disposable local identity. Browser observations verified:

- Real form login reaches `/app/`; the packaged HTML and assets load.
- Creating a task, advancing it and posting a comment work; the displayed author comes from the authenticated identity.
- A second tab submitting an old revision receives 409. Refresh loads the accepted state and now replaces stale error feedback with Ready.
- A fresh server process retains the task's DONE state and its comment.
- An HTTP request without session credentials to `/api/tasks` returns 401.
- After stopping the server, restoring its database backup recovers the original task/comment and excludes the task created after that backup.
- Project Studio renders the final rubric and handoff. Deferring the capstone reaches the final lesson without recording a challenge pass.

Temporary Java and Vite servers were stopped after verification. Browser smoke tests complement the executable checks; they do not certify every viewport, assistive technology or future deployment environment.
