# E — Build a complete application around the game

**Status: curriculum draft; these lessons are not implemented.** This extends the [C++ learning path](../../cpp-games-learning-path.md) to the user's requested full-stack outcome. A full-stack application includes a user interface, a server and persistent data. The backend will use C++; the browser interface will explicitly teach HTML, CSS and JavaScript from scratch. Basic Python scripting does not imply prior web knowledge, and native graphics does not supply it.

This branch starts after the terminal game, trained-opponent evaluation and packaging gates. SDL and Vulkan are not prerequisites for a web application. Learners can pursue the graphics branch, this application branch, or both. Native game clients can connect to the service after learning the same protocol boundaries.

## Show the application before teaching its infrastructure

E00 must open with the actual working Match Journal: create a private account, record a game, inspect the stored result after restarting the server, filter match history, compare frozen opponent versions and export one's records. Show the browser and server as two separate running programs. The demonstration must be built and verified before the opener is published; this storyboard is not a claim that the application exists.

The learner's reason to finish is a useful application they can run for other people, explain, modify and recover when it fails. A leaderboard alone is not the first project: accepting a client-submitted score would teach an unsafe trust model. Begin with a personal journal where entries are explicitly user reports; a later authoritative match service owns competitive outcomes.

## Teaching sequence

Every row expands into focused lessons under the existing [authoring gates](authoring-gates.md). Select maintained dependencies and verify their documentation when implementing; do not invent a framework API in a draft.

| Section | Concrete project behavior | New material, taught before use | Independent evidence |
|---|---|---|---|
| E01 — A browser displays a document | A static match report with keyboard-accessible controls | HTML structure, semantic elements, CSS layout, labels and focus; distinguish markup from C++ | Build a different report from a sketch, explain its document structure and navigate without a mouse |
| E02 — A browser changes a view | Filter in-memory sample matches | JavaScript values, functions, objects, arrays, DOM, events and modules, with comparisons to already-taught C++ | Implement a new filter without a supplied body; handle empty results and preserve source data |
| E03 — Two programs exchange a request | Inspect one local request and response before writing a server | Client/server, URL, HTTP method/status/headers/body, JSON, ports and localhost | Trace successful and malformed requests; distinguish network failure from a rejected request |
| E04 — A C++ service owns an interface | Local read-only match endpoints | Dependency acquisition and pinned versions; route handling, JSON conversion, validation and boundary types | Add a new endpoint with valid, missing and malformed cases; do not return internal error details |
| E05 — Store a result across restarts | Add and retrieve journal entries from a database | Tables, primary keys, SQL, prepared statements, schema changes and transactions | Preserve data after restart; reject malformed entries; demonstrate rollback after a failed multi-step change |
| E06 — Join the browser to the service | Submit and list entries in the UI | Fetch, promises and async/await, loading/error states, same-origin policy and configuration | Handle delayed, failed and duplicate submissions while retaining user input; end-to-end checks use real processes |
| E07 — Separate users' records | Accounts and private match histories | Identity versus authorization, sessions, established password hashing, cookies, CSRF and access checks | One user cannot read or change another user's record by altering an identifier; logged-out requests fail correctly |
| E08 — Make ownership visible in concurrent work | Several users request changes without corrupting state | Threads/tasks as required by the chosen server, shared state, races, locking and database concurrency | Reproduce a race in a safe controlled example, then verify a repair and an invariant under concurrent requests |
| E09 — Turn failure into useful information | Diagnose failed requests and slow queries | Structured logs, request identifiers, timeouts, resource limits, profiling and privacy-aware diagnostics | Diagnose a seeded fault from evidence; verify logs omit passwords, session secrets and sensitive payloads |
| E10 — Release and recover | Deploy a configured service and browser client | Build artifacts, environment configuration, TLS termination, secret handling, migrations, backups, restore and CI | Build from a clean checkout, deploy to a test environment, restore a backup and demonstrate rollback procedures |
| E11 — Let the server own competitive play | A browser or native client submits actions to an authoritative match | Protocol state, request identity, retries, idempotency, turn authorization and version compatibility | Duplicate or out-of-turn actions cannot change the result twice; server checks rules without trusting client scores |
| E12 — Independent application capstone | A different useful application chosen by the learner | Requirements, scope, design alternatives and incremental delivery | Implement from a brief without a tutorial solution; demonstrate tests, ownership boundaries, deployment and recovery to another person |

Security material needs current primary-source review when authored. Teach each mechanism through a concrete failure and repaired test, using established libraries rather than asking beginners to invent cryptography. Completing a local demo does not establish internet-facing readiness.

## Completion evidence for the larger path

The intended exit is independent development of scoped applications and games, not mastery of every engine, web platform or C++ feature. Require two separate capstones:

- A new game: the learner chooses rules, designs state and interfaces, implements a playable client, tests boundaries, packages a build and explains performance measurements. If it uses learning, it compares a frozen policy with a baseline on held-out runs and reports limitations.
- A new full-stack application: the learner designs data and API boundaries, implements an accessible browser interface and C++ backend, tests validation and authorization, deploys it, then proves a backup can be restored.

Review an unfamiliar change after a gap: introduce a new requirement or bug without providing file-by-file edits. Ask the learner to locate the responsible component, propose a test, implement the change and explain the result. Guided lesson completion and a matching file diff are preparation for this assessment, not substitutes for it.
