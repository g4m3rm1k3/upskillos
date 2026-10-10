# Build a 3D Game Studio — Learn Engineering Through Games

Status: Foundations includes scene editing, undo/redo, versioned save/open, a visible box experiment followed by per-object asset recipes and saved dimensions, and an early native Q-learning playground, 2026-10-10. Circuit Clash exists separately. Play/Stop isolation, editor-authored games, export and further genres remain planned. See [opening implementation and verification](3d-studio-opening-verification.md).

The [completion roadmap](3d-studio-completion-roadmap.md) maps current gaps to full 3D authoring/runtime capability, recurring Q-learning projects, deeper C# and the immediate author-play-export sequence. Planned features remain distinct from implemented lessons.

## Audience and destination

Assume only that the learner has written a small program using variables, conditions, loops and functions. Do not assume Python specifically, C#, classes, Git, a terminal, vectors, game engines, SQL, testing or networking. Offer a short recovery exercise for each entry skill. Teach new mathematics through pictures, small numerical experiments and game behavior before introducing notation.

The learner first builds a small 3D game studio app, then uses it to make games. Each new genre creates a concrete need for another editor or runtime capability, which the learner implements, tests and uses in that game. The studio remains the continuing software project; games are separate projects made with it.

The learner should finish able to design, implement, debug, test, profile and release both the studio and a small 3D game, and explain their data, algorithms and architecture. This is a substantial applied computer science path; it cannot promise every topic in software engineering or computer science.

Every project is genuinely three-dimensional: position and collision use three spatial axes, and the camera projects a 3D scene. A fixed or overhead camera is fine; a flat game drawn with decorative depth is not a substitute for teaching spatial reasoning.

## Playable reference and learner implementation

[Circuit Clash](circuit-clash-course.md) establishes a useful pattern: play a browser reference, then author a native C# implementation in Project Studio. The browser game and native game are distinct implementations. Shared rules and observable scenarios establish their relationship; their language, renderer, platform and deployment are different.

For the core path, retain C# and the existing Circuit Clash graphics approach to reduce repeated toolchain learning. Exact SDK and dependency versions must be chosen and verified when each track is authored; this plan does not introduce new package requirements. Teach C# from the learner's existing programming concepts. Start with a tiny console experiment, then a window and a movable shape. Introduce libraries only when a problem requires them.

Each future reference must represent the taught destination, including its genre's defining interaction. Use the same testable rules and small scenario fixtures where practical, rather than maintaining two unrelated feature lists. Label unavailable reference games as planned. Do not publish a launch link before its route exists.

An optional web implementation branch comes after native foundations. Explicitly teach JavaScript/TypeScript, modules, asynchronous browser APIs and rendering lifecycle there; do not silently switch languages midway through the required path. An optional engine branch can later rebuild a finished game in an established engine and compare it with the learner's studio.

The existing [Build Your Own Game Studio plan](studio-from-scratch-plan.md) is a separate TypeScript/Electron path with a 2D-oriented runtime. Reuse its teaching patterns where useful, but do not silently replace its published lessons or imply that it already implements this C# 3D studio. The C# direction here is a proposed continuation of Circuit Clash's language; UI libraries and packaging choices still need a tested authoring spike.

## Teaching order and prerequisite gates

Feature suggestions describe destinations; they do not determine the next lesson. Place each feature where the learner has the required concepts and where a game or editor task supplies a concrete reason to use it. The author owns this ordering; an introductory learner should not have to audit the prerequisites.

The current foundation order is setup and C# values, scene data, viewport, selection/editing, creation/deletion, history, the bounded Beacon Bot experiment, then scene persistence. The bot is an early motivational branch built on its own explicit rules; it does not assume a finished editor runtime.

The asset continuation follows a visible-to-durable sequence:

| Lesson | Concrete reason to learn it | Required evidence before advancing |
| --- | --- | --- |
| [See box dimensions change](../src/labs/project-studio/tracks/games3d-foundations/08c-shape-preview.md) | Make tile and trunk proportions visible; observe a preview that follows selection | Predict bottom height, diagnose mismatched wires and explain the ownership failure |
| [Validated asset recipe](../src/labs/project-studio/tracks/games3d-foundations/09-box-recipes.md) | Give observed dimensions an explicit valid representation | Reject invalid dimensions, explain record/value semantics and test an independent scale policy |
| [Per-object box editing](../src/labs/project-studio/tracks/games3d-foundations/09a-box-editing.md) | Keep a tile and trunk independent and undo a resize | Preserve IDs and centers, restore dimensions and preserve redo on rejection |
| [Saved dimensions and migration](../src/labs/project-studio/tracks/games3d-foundations/09b-box-storage.md) | Keep the authored shapes across restart without discarding earlier scenes | Round-trip sizes, migrate unit cubes and reject a late corrupt shape without losing active data |

After this connected box workflow, extend primitives/materials for a small authored room. Build play isolation, time and collision for the first playable game. Introduce compound props when repeated construction needs reuse, mesh geometry when a ramp or track needs custom triangles, and importing after asset identity, dependencies and resource ownership are taught. A suggestion for a future capability belongs in those arcs rather than interrupting the current prerequisite chain. Return to Q-learning through the playable game rules once those rules exist.

## Project sequence

Each row is a project arc made of short lessons, not one lesson or a giant code dump. Begin with a usable studio, then alternate game development with studio development. Later projects reuse the same studio and runtime but have separate scenes, assets, rules and saves. A learner joining later receives a named prerequisite bridge and a small diagnostic task.

| Arc | Playable destination | New problems and concepts | Independent evidence |
| --- | --- | --- | --- |
| Studio foundations | A desktop app that creates, edits, saves and plays a small 3D scene | C# bridge, window and input, coordinates, scene data, selection, inspector, commands, undo/redo, persistence, separate edit/play state and standalone runner | Create a new scene, save/reopen it, undo an edit, play/stop without changing authored data and run it outside the editor |
| Early learning experiment: Beacon Bot | Step a trained bot through a tiny native 3D playground | Explicit environment rules, state/action encoding, enums, value records, tabular Q-learning, exploration, seeded experiments and frozen-policy evaluation | Hand-check updates, compare an untrained policy and evaluate multiple seeds; explain why this fixed grid is not yet a general game runtime |
| Foundation: Beacon Island | Explore a small 3D island, collect beacons and reach an exit | C# bridge, execution, values and units, conditions, functions, arrays, state, coordinates, camera, input, frame time, simple collision, debugging and first tests | Add a new collectible rule; explain and fix a frame-rate-dependent movement bug |
| Racing: Circuit Clash in the studio | Third-person kart combat race with garage and opponents | Reuse the existing game's rules as a reference; add track editing, ordered gate validation, reusable kart definitions, materials, chase-camera settings and shared driver contracts | Author a second track in the studio and run it without changing the editor; preserve existing course IDs and verify migrated rules |
| Platforming: Skybound Courier | Jump between platforms and moving lifts, deliver parcels, restart at checkpoints | Velocity and acceleration, grounded state, collision normals, swept tests, jump buffering, camera occlusion, animation, interpolation and accessibility | Prevent tunneling through a thin platform; design cases for landing, walking off an edge and jumping on a moving lift |
| Puzzle: Clockwork Rooms | Solve switches, doors and movable-object puzzles | Boolean logic, truth tables, state machines, events, command history, stacks, undo, serialization, level validation and editor tools | Design a solvable new room; explain an invalid state and implement a validator that rejects it |
| Strategy: Sentinel Valley | Defend a 3D route with towers and navigating enemies | Grids and graphs, BFS, weighted paths, Dijkstra and A*, priority queues, spatial indexing, targeting, scheduling, complexity and measurement | Reroute enemies after a blocked path; compare search work and verify that an unreachable goal terminates |
| RPG: Harbor Quest | Explore a town, complete quests, trade items and keep multiple saves | Relational data, SQL, keys and constraints, joins, transactions, indexes, migrations, repositories, dialogue graphs and domain rules | Make a purchase atomic; recover from an interrupted migration and preserve an older save |
| Action: Signal Arena | Single-player arena against bots, then an optional networked version | Composition, reusable components, behavior trees, ray tests, resource ownership, object pools, profiling, concurrency; later protocol design and authority | Fix a measured frame-time problem; in the network extension reject a duplicated or impossible command |
| Simulation: Workshop Worlds | Build a small factory with resources, machines and routes | Discrete simulation, queues, dependency graphs, scheduling, deterministic random sources, data-oriented storage, caching and economic balance | Explain a bottleneck using measurements; reproduce an event trace from the same seed and commands |
| Capstone: An original game | A small released game in a learner-chosen genre | Requirements, prototypes, architecture decisions, risk, issue planning, code review, CI, licensing, accessibility, packaging and maintenance | Deliver a playable build, tests, performance evidence, design rationale and a post-release change |

Circuit Clash's published files and progress keys remain stable. Its [readiness audit](circuit-clash-course-audit.md) still applies. The new foundation arc broadens entry to any introductory programmer without pretending that Circuit Clash's current Python-scripter audience has already been revalidated.

## The first studio is a usable small app

The first release has a 3D viewport, an object list, an inspector, new/open/save, undo/redo and play/stop. The learner can add cubes and a ground plane, select and name them, edit position/rotation/scale and color, and save a scene. A simple player behavior can be attached through an explicit C# registration table; arbitrary user-script compilation and live reload are later features.

Start the inspector with ordinary numeric fields and selection from the object list. Introduce clicking objects in the viewport only after teaching rays and intersections; transform gizmos can wait for platformer level authoring. Use built-in shapes before an asset importer. A tiny playable room proves the editor can make a game before the first genre arc.

Built-in primitives and low-poly asset construction are part of the core studio, alongside mesh/model import. The [asset plan](3d-studio-assets-plan.md) specifies the shape palette, procedural geometry lessons, reusable compound props, tested import subsets, resource ownership and relocation/export checks. The first game must be buildable without downloading external art; later imported visuals use the same object, behavior and collision workflows.

The first architecture has four responsibilities, introduced incrementally rather than scaffolded as unexplained abstractions:

- **Scene data:** stable object IDs, names, transforms and behavior settings. Persist plain data, never graphics handles or editor widgets.
- **Runtime:** input, simulation and rendering. It consumes scene data and runs a game without the editor.
- **Editor:** selection, inspector, editing commands and project files. It changes authored data through one validated path.
- **Game project:** a project manifest, scenes, assets and game-specific C# behaviors. Genre rules live here unless multiple games demonstrate a reusable runtime need.

Edit mode owns the authored scene. Play creates independent runtime state; Stop discards it. Play changes never silently enter the saved scene. The editor camera and player camera are separate. Undo records editor commands, not every simulation frame. Scene saving uses a versioned format, validates IDs and values, and preserves the last good file if validation or writing fails.

The standalone runner loads the same validated scene format and behavior definitions as Play. Initially export is a documented build-and-copy operation, not an installer wizard. A packaged game must launch without the editor and must fail clearly if a required asset is missing.

## Studio features earned by games

| Game need | Studio/runtime feature to build | Engineering lesson and regression |
| --- | --- | --- |
| Beacon Island needs several editable locations | Scene creation, simple behaviors, triggers, HUD and local project folders | Stable identity, serialization, validation and independent play state; an edit survives save/reopen while collected beacons do not alter the authored scene |
| Racing needs tracks and shared karts | Track/gate authoring, reusable object definitions, vehicle tuning and camera preview | Ordered data, composition and reusable definitions; invalid gates are rejected and one kart instance cannot mutate another |
| Platforming needs precise level construction | Transform gizmos, snapping, collision previews, moving-platform timelines and animation support | Coordinate spaces, geometry and timing; undo a drag and test landing on a moving platform |
| Puzzles need linked switches and doors | Typed properties, object references, event connections and room validation | Graphs, state machines and dependency validation; deletion detects dangling references and undo restores the connection |
| Tower defense needs navigable maps | Grid/navigation editing, path visualization, waves and performance counters | Search, heaps, spatial indexes and measurement; blocked routes terminate predictably and diagnostics match actual runtime paths |
| RPGs need editable content and persistent progress | Item/quest/dialogue tools, SQLite integration and migration tools | Relational modeling, transactions and versioning; failed purchase rolls back and old saves migrate without data loss |
| Action needs imported characters and responsive bots | Asset import, material/animation tools, AI inspection and profiling | File boundaries, resource ownership and measured optimization; repeated load/unload does not leak resources |
| Simulation needs large interacting systems | Dependency visualization, simulation stepping, replay and bottleneck inspection | Scheduling, determinism and data layout; identical recorded commands reproduce the same state |
| Releases need reliable delivery | Asset dependency checks, standalone export, configuration and build automation | Reproducible builds and support diagnostics; exported games work without editor-only files |

Visual scripting, a plugin system, multiplayer, collaborative editing and hot reload are optional later projects. Introduce each only after a concrete game requirement and its prerequisite lessons. A component model may grow from repeated behavior needs; a full entity-component-system architecture is not an entry requirement.

## Build the studio in runnable milestones

The studio comes before Beacon Island. Each milestone must remain runnable before another is added. An early Beacon Bot experiment follows editor history, before persistence: train on a tiny fixed world and step its frozen policy in a native 3D runner. It reuses Core and the graphics toolchain but is not yet editor-authored or Play mode. Later connect the environment to validated scene markers after play-state isolation and triggers exist. Making a polished genre game waits until the editor can author, save and play it.

1. Observe the destination studio: add a shape, change its position, save, play and stop. Explain editor, runtime and game project using those actions. Write one observable acceptance case.
2. Run and change a console program. Teach files, directories, terminal commands, compile versus run, compiler diagnostics, and reading the first useful error.
3. Bridge to C#: values, numeric types, assignment, comparisons, Boolean expressions, functions and scope. Predict integer division and repair it using explicit units.
4. Represent a tiny scene as data. Teach arrays, indices, names and stable IDs before object design. Print the scene and test a position change without a window.
5. Open a window and close it cleanly. Teach the update/render loop and library ownership. Draw one 3D shape and explain camera position, target and perspective.
6. Move on three axes. Introduce vectors as grouped coordinates, then addition, scaling, distance and normalization through movement. Explain each library operation before relying on it.
7. Add an object list and selection, then an inspector that edits one position field. Explain screen coordinates, focus and numeric parsing. Invalid input leaves the last valid value intact.
8. Add creation, naming, deletion, transform and color fields. Centralize validated edits, then record reversible commands for undo/redo. Teach stacks through actual editor history.
9. Save and reopen a versioned scene in a project folder. Validate data before replacing the active scene, preserve good files on failure and explain authored content versus player saves.
10. Add Play/Stop using an independent runtime scene and separate player camera. Read input, measure time and demonstrate frame-rate-independent movement. Teach copying versus shared references by deliberately breaking play-state isolation.
11. Add a ground plane, simple collision and a trigger to the playground. Attach one explicitly registered C# behavior. Define behavior lifecycle and teardown; keep object-ID references valid after load.
12. Extract a standalone runner when sharing Play's logic becomes necessary. Export and run the playground outside the editor. Test missing assets and independence from editor state.
13. Review the usable studio, fix one observed usability problem and independently add an inspector property with save/load and undo tests. Refactor only demonstrated duplication into runtime/editor boundaries.

Beacon Island is the first game made with that studio: author its scene in the editor, add collection and exit behaviors, introduce HUD/audio and settings, then test, profile and release. Every discovered editor limitation becomes a small feature lesson with a visible before/after game workflow.

Git is introduced after the first working program: inspect a diff, make a local commit, recover an edit, then branch and merge a small change. This describes learner exercises; repository agents still follow the rule against committing or pushing unless asked.

## Engineering strands revisited across genres

| Strand | First encounter | Deeper application |
| --- | --- | --- |
| Logic and correctness | Inspector validation and edit/play invariants | Beacon collection; puzzle truth tables; RPG transaction invariants; network command validation |
| Programming and abstraction | Values, functions, scope and state | Encapsulation, interfaces, composition, dependency boundaries and data-oriented tradeoffs |
| Computer systems | Source, compilation, runtime, memory and files | Resource lifetime, allocation, CPU/GPU work, threads, synchronization and networks |
| Data structures and algorithms | Scene lists, object-ID lookup and undo stacks | Queues, graphs, heaps, pathfinding, spatial partitioning and scheduling |
| Mathematics and physics | Coordinates, units, vectors and elapsed time | Transforms, dot/cross products, projection, collision, integration, probability and numerical error |
| Graphics and assets | Mesh, triangle, camera and basic lighting | Materials, textures, animation, shaders, asset formats, loading, resource cleanup and draw-call costs |
| Data and persistence | Project/scene files, stable IDs and validation | Separate player saves; SQL schemas, relational constraints, transactions, query plans, migration and recovery |
| Software engineering | Small requirements, debugging and behavioral tests | Design decisions, change isolation, code review, automation, releases and maintenance |
| Game design and production | Rules, feedback, controls and restart | Difficulty, balance, level design, playtesting, audio, accessibility and scope control |
| Security and distributed work | Treat loaded data as untrusted | Parameterized SQL, size limits, server authority, authentication boundaries, timeouts and abuse cases |

Teach terminology at the point of need. For example, first show repeated tower scans becoming expensive; then explain a spatial index and measure the improvement. Do not require a survey of every design pattern before the learner has a game to change.

## Database arc: teach a real data model

Harbor Quest starts with item, player, inventory and quest records. Begin with a concrete question such as “Which unfinished quests reward an item this player does not own?” Show why unrelated JSON lists make this awkward before introducing tables and joins.

The planned sequence is:

1. Model identities and relationships; distinguish an item definition from an owned item instance.
2. Create a local SQLite database, using a dependency verified during authoring. Teach schema creation, primary and foreign keys, nullability, uniqueness and check constraints.
3. Insert, select, update and delete through parameterized commands. Explain parameters as data rather than executable SQL.
4. Join inventory to item definitions; aggregate stock and rewards; discuss normalization using an actual inconsistent record.
5. Purchase inside a transaction: check stock and funds, debit currency and grant the item together. Force a mid-operation failure and verify rollback.
6. Add an index for a measured query. Inspect its plan and explain the write/storage cost; do not infer speed from a tiny demonstration database.
7. Version the schema and migrate an older save. Test interrupted migration, unknown newer versions, backups and restore.
8. Put persistence behind a small boundary so gameplay tests can run without a graphics window. Teach integration tests against a temporary real database as well as rule tests.

A remote database is an optional later service exercise, not a prerequisite for local play. A deployed client does not receive database credentials. Networked economies require server-authoritative transactions and separate verification; a local SQLite exercise does not establish that behavior.

## Lesson contract

Follow the [Project Studio lesson standard](project-studio-lesson-standard.md). Each lesson teaches one observable capability through a small worked example, a prediction, a runnable change, a deliberate failure and repair, and an independent transfer task with progressive hints.

Show what the learner should see and explain what a check proves. A visual smoke check, a matching diff and a gameplay rule assertion provide different evidence. Require observation, explanation and an independently designed change; successful transcription alone is not mastery.

Keep full independent solutions behind an intentional reveal. Guided edits can have visible references. Optional extensions must not supply code required by later lessons. Never populate a learner's editor with an undisclosed implementation.

Use short steps and small compilable fragments. Split a lesson when it simultaneously introduces new syntax, mathematical notation, an architectural boundary and a new tool. Preserve published lesson and step IDs; use the standard's keyed headings for insertions.

## Project Studio integration and release gates

New lessons live in discovered track folders under `src/labs/project-studio/tracks/`. The opening implementation is [games3d-foundations](../src/labs/project-studio/tracks/games3d-foundations/00-your-studio.md), grouped by a games3d series entry in series.js. Its chapters share one learner project folder. Future genre folders can use the games3d- prefix, but must get their own reviewed prerequisite profiles. Circuit Clash remains a separate course: it builds its own game, not a project using this editor. Adaptation into the studio is a future racing arc, not a silent reassignment of its existing learner workspace.

Assign actual prerequisites and maturity per track in `learningProfile.js`; do not let a prefix automatically certify a future chapter as beginner-ready. Add only real published tracks to navigation, and show future work as planned text.

Before releasing each arc:

- Reconstruct every required edit in order in a clean author workspace; compile and run at each designated milestone. Document the exact toolchain and OS.
- Execute behavioral checks, expected diagnostic failures and plausible wrong implementations. Reject compiler crashes as proof that a wrong rule was detected.
- Inspect the rendered lessons, references, hints, diffs and navigation. Play the native milestone and any browser reference; compare defining scenarios and document intentional differences.
- Check focus, pause, restart, cleanup, input remapping, legibility and accessible feedback. Record human playtesting separately from automated behavior tests.
- Verify persistence and recovery, then launch the packaged game on each claimed supported platform. Keep untested platforms explicit.
- Run applicable Project Studio tests and regenerate catalog facts when catalog content changes. Record exact commands and outputs; structural checks are not learner-readiness evidence.

## Rollout and current status

1. Curriculum: this proposed map establishes audience, projects, topic progression and evidence gates. Review scope and pacing before choosing a publication schedule.
2. First implementation: author the studio's console scene-data exercise and first 3D viewport, then object list, inspector, save/load, undo and isolated Play/Stop. Verify the tiny playground in the standalone runner and test the workflow with introductory programmers.
3. First games: build Beacon Island with the studio, then adapt Circuit Clash as the racing arc by adding track and kart authoring. Explain web reference versus native implementation prominently and retain the existing course and its platform/pacing review.
4. Next genres: platformer, puzzle and tower defense, each with an independently buildable destination and its own walkthrough verification.
5. Data and production: RPG database arc, single-player action arena and simulation. Publish networking as a clearly optional extension after the local game works.
6. Capstone and optional branches: independent release, web implementation and engine comparisons after the core prerequisite chain is stable.

The Foundations lessons now implement scene data, the viewport, selection/position editing, creation/deletion and snapshot-based undo/redo. The continuation teaches stable identities, ownership, stacks, failed operations and branching history, then connects them to keyboard and pointer controls with a paged object list. History is in memory and unbounded; immutable records make the introductory snapshots safe, while future mutable components require a deeper copying policy. Versioned JSON save/open and an early Q-learning prototype are now authored. Next introduce independent Play state and connect a validated beacon scene to the bot environment. Additional games, database integration and network services remain planned.

## C# depth through concrete engineering needs

Every abstraction lesson must show its benefit, cost and an alternative. More indirection is not automatically better. Teach a concrete version first, give it a requirement that exposes a limitation, then compare the revised design with behavioral evidence.

| Need | C# concept and current example | Benefit and cost to explain |
| --- | --- | --- |
| Inspect scene objects without arbitrary external edits | IReadOnlyList, immutable records, private ownership | Smaller mutation surface; a read-only view is not a frozen collection and mutable nested data still needs care |
| Describe discrete learning feedback | Enum and readonly record struct | Named actions and value equality; casts still permit invalid enum values and value/reference semantics must be understood |
| Store estimates and detect duplicate IDs | Rectangular generic-free numeric arrays, List<T>, HashSet<Guid> | Choose a structure for access/order/membership needs; explain bounds, complexity and memory |
| Replace storage without rewriting editing | ISceneStore, two implementations, constructor injection | Substitution and controlled failures; the interface adds another contract and cannot enforce semantics alone |
| Close file handles even on failure | IDisposable and using declarations | Deterministic resource cleanup; distinguish disposal from garbage collection and namespace imports |
| Recover from expected failures | Specific exceptions, try/catch/finally | Preserve valid work and report outcomes; broad catches can conceal bugs and inheritance determines matching |
| Find and transform data | Upcoming IEnumerable<T>, foreach protocol, LINQ and iterators | Compare loops with lazy queries, repeated enumeration and allocation when scene queries become awkward |
| Decouple live editor updates | Upcoming delegates, events and subscription lifetime | Introduce with a concrete panel update requirement; test teardown and avoid dangling subscriptions |
| Load substantial assets while remaining responsive | Upcoming Task, async/await, CancellationToken and synchronization | Introduce after measuring a blocked UI; keep graphics ownership on its required thread and bound cancellation |

Early learning sequence: explicit transitions → numeric update experiment → exploration and bounded training → frozen evaluation across seeds → visible 3D decision stepping. Report failures as well as wins. A fixed learning rate and finite episodes do not establish convergence or transfer to unseen maps. Larger games revisit representation, reward design, evaluation leakage, baselines, reproducibility and policy persistence before introducing deep learning.

Quality review still needs introductory learners: ask them to predict, explain an observed failure and make an independent tested change. Author reconstruction, mutation checks and screenshots establish selected technical contracts; they do not establish pacing, accessibility or learner mastery. Keep the series in-development until that review has evidence.
