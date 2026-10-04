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
