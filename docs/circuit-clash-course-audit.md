# Circuit Clash course readiness audit

Date: 2026-10-08. Audience: a learner who can write small Python scripts but needs explicit instruction in types, debugging, architecture, graphics and machine learning. No other UpSkillOS series is a prerequisite.

## Decision

The guided implementation reaches a complete local native game; it is not a placeholder syllabus. Published fragments are the authority for author verification. The course stays **Review pending** because executable correctness does not establish beginner comprehension, driving feel, accessibility or portability. The remaining review is concrete and listed below, not hidden behind a claim of universal readiness.

## Prerequisite and evidence map

All paths below refer to `src/labs/project-studio/tracks/circuit-clash/`.

| Capability | Teaching and repeat application | Evidence available |
| --- | --- | --- |
| Execution and representation | `01-tools-and-first-run`, `01a-program-and-machine`: shell, build, runtime, bytes, encoding, lifetimes | First execution, compiler diagnostics and printed representation experiments |
| Types, expressions and units | `02-values-and-units`, `02a-know-the-type`, then `08-karts-and-state` | Inferred `int` versus fractional `float`, division before assignment, truncation, precision and overflow; game type/unit ledger |
| Logic and debugging | `03-decisions-and-repetition`, `03a-logic-and-invariants`, `04-functions-and-red-green`, `04a-debugging-and-scope` | Truth tables, guards, loop boundaries, meaningful red/green assertions, stack trace and missing-result contract |
| State, ownership and contracts | `05-objects-and-collections`, `05a-contracts-and-data`, later policies and application tasks | Independent objects, encapsulated mutation, parsing, value copies and independent policy snapshots |
| Data structures and algorithms | `05b-search-and-cost`, `05c-graphs-and-queries`, later targeting/collisions | Linear search, insertion sort, binary search, BFS with a visited set and parent links, collection costs and deferred queries |
| Repository and dependency work | `06-project-boundaries`, recurring build checkpoints, `29-profile-package-and-release` | Separate Core/Game/Checks projects, pinned binding, Git staging, branching, conflict and recovery exercises; focused release evidence |
| Graphics and mathematical reasoning | `07-track-math`, `07a-vector-reasoning`, `09-triangles-and-light`, `09a-from-mesh-to-pixels`, `10-first-window`, `11-build-the-kart`, `17-camera-and-world` | Unit vectors, angle units, dot/cross products, transforms, outward winding assertions, perspective calculation, generated geometry and native rendering smoke check |
| Game design and architecture | `08-karts-and-state`, `12`–`19`, `23`, `25`–`27` | Shared rule boundaries, ordered gates, combat, collision, pause, fixed steps, queued input, driver interface/Strategy, menus and HUD |
| Persistence and failure handling | `20-save-the-garage`, `25-application-lifecycle`, `28-regression-and-evidence` | Purchase invariants, real JSON round trip, malformed and semantically invalid save preservation, rejected policy rows, permission fallback |
| Probability and reinforcement learning | `20a-learning-and-probability`, `21-q-update-experiment`, `22-the-policy-table`, `24-training-and-evaluation`, `24a-measure-learning` | Expected reward, discounting, numerical update, legal-action masks, terminal handling, exploration, reproducibility, held-out paired comparisons and reward tradeoffs |
| Concurrency and delivery | `24b-work-and-ownership`, `25-application-lifecycle`, `29-profile-package-and-release` | Task ownership, nonblocking result adoption, progress communication, native packaging and release investigation |
| Independent transfer | `30-transfer-and-design-review` and return-later challenges throughout | New requirement/design prompts and diagnostic cases; these require learner work and are not claimed passed by author tests |

## Corrections from this audit

- Added the dedicated foundations above instead of assuming a Python scripter understands static types, numeric precision, ownership, algorithms, vector units, probability or worker threads.
- Split early collection practice into distinct array, list/queue and dictionary steps. Explain null, zero and empty separately.
- Kept Race features buildable as separate parts of the same class, and introduced the saved policy data contract before its serializer references it.
- Preserved published progress keys with keyed inserted steps. Optional work never supplies required implementation fragments.
- Connected accumulated typed fragments to the existing live diff and editor match indicator. The learner editor is never populated with the reference. Browser-only reading shows explicitly labelled changes from the preceding guided step, with unchanged lines folded.
- Fixed the editor's misleading “0 lines still to add” status when extra text is the actual mismatch. Project XML gets XML highlighting.
- Added required regressions for unsupported garage schemas, unowned selection, empty/misshapen policies, legality-aware action selection and Q updates, paused hazards/pickups, and single-impact hazard expiry.
- Reject empty saved policies instead of presenting an untrained table as loaded learning. Catch denied policy-read permission alongside expected JSON/I/O errors so scripted fallback remains available.
- Extended the author checker with deliberate mutations. It requires each mutation to fail at the intended behavioral assertion, rejects compiler failures as evidence, restores source in `finally`, and rebuilds/runs the restored program afterward.

## What the tests cannot certify

A reconstruction compiles the fragments in order; it does not measure whether a beginner can explain them or create an independent design. A matching diff checks transcription, not behavior or understanding. Headless races exercise rules, not human controls or visual comfort.

The optional challenges remain open exercises, not automatically graded proofs of competence. Learners may defer and return. The required path includes runnable assertions and deliberately broken examples; there is no coding-agent section.

This is an applied engineering foundation. It does not cover all of computer science, arbitrary frameworks, distributed systems, production networking, advanced statistical inference or neural reinforcement learning. Steering is scripted; tabular Q-learning chooses equipment tactics. Rendering uses a real native library with learner-built geometry and CPU face lighting, not a learner-built GPU driver or shader compiler.

## Remaining release review

1. Have a Python-scripter learner work through setup, the numeric-type diagnostic, a class/ownership exercise, the first graphics window and a Q update. Record missing explanations and time spent recovering before promoting the catalog maturity label.
2. Repeat native installation, graphics, input, training, persistence and packaged launch on Windows, Linux and Intel macOS. Apple silicon macOS is the verified native environment so far.
3. Review manual steering, menu readability, input accessibility and the fixed desktop layout. Current keyboard menus are not evidence of screen-reader support.
4. Keep the known broader Project Studio Git-path detection and process-tree termination failures visible; passing course checks does not make the whole application suite green.

For commands, results, artifact boundaries and prior native/browser checks, see [the course verification record](circuit-clash-course.md).
