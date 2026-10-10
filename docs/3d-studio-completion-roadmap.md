# Completing the C# 3D studio and game series

Status: scoped implementation roadmap, 2026-10-10. This document separates implemented capabilities from future destinations. It complements the [curriculum](3d-games-project-studio-curriculum.md), [technical evidence](3d-studio-opening-verification.md) and [human teaching pilot](3d-studio-teaching-pilot.md). Future rows are not published lessons or available features.

## Where we are

The taught C#/.NET app renders individually sized native 3D boxes and supports a scene list, selection, position edits, creation/deletion, paged selection, snapshot undo/redo and versioned JSON save/open, including box dimensions and migration of earlier unit-cube scenes. Rule and storage checks execute independently of graphics. The early tabular Q-learning experiment defines a fixed grid, trains a bot, evaluates a frozen policy and renders its decisions in a separate native runner.

The editor does not yet author a playable game. Scene objects have validated box recipes but no general rotation/scale transform, hierarchy, collider, behavior or reusable compound asset definition. The bot does not yet load an editor-authored world. The current navigation experiment uses X/Z tiles at fixed height; that is a controlled early learning problem, not unrestricted 3D navigation.

The lesson outcomes and transfer prompts are authored. Technical checks have evidence, while introductory learner sessions, human native input, accessibility and macOS verification remain pending. Snapshot history is unbounded; save/open is a fixed-path teaching workflow rather than a complete project manager or recovery system.

## What full 3D game capability means here

The destination studio must author, inspect, simulate, save and export small games across exploration, racing, platforming, puzzle, strategy, RPG, action and simulation. Models, cameras, transforms, spatial interactions, animation, sound and assets must participate in actual gameplay. A game must run without the editor.

Build a small released game before expanding every subsystem. Each later genre supplies a requirement for another editor/runtime feature. Reuse only behavior shown to be common; keep game-specific rules in game projects. The following coverage is a destination, not an instruction to build a large engine before the first playable room.

| Capability still to build | Concrete destination | Independent evidence |
| --- | --- | --- |
| Runtime lifecycle and time | Play/Stop, pause, restart, fixed simulation stepping, rendering interpolation and separate player/editor cameras | Same input trace at different render rates; stopping and restarting preserve authored scene and history |
| 3D transforms | Position, rotation, scale, local/world spaces, parent/child hierarchy and reparenting | Nested rotated/scaled objects preserve specified world pose; invalid scales and hierarchy cycles rejected |
| Authoring workflow | Naming, numeric property entry, viewport ray selection, translate/rotate/scale gizmos, snapping, multi-selection and reusable object definitions | Pick the intended object; undo a compound drag once; editing an instance cannot corrupt another instance |
| Spatial interaction and physics | Bounds, overlap, rays, triggers, collision filtering, character motion, gravity, slopes, swept collision, then rigid bodies and constraints where games need them | Thin-wall tunneling, grounded edges, moving platforms, start-in-overlap and high-speed cases; compare library integration against taught geometric rules |
| Camera and input | Free/editor, first-person, orbit and chase cameras; focus, mouse capture, remappable keyboard/mouse/gamepad input | Losing focus cannot leave movement stuck; player and editor cameras keep independent state |
| Graphics and assets | Built-in primitive palette, procedural low-poly meshes, reusable compound props, mesh/model import, textures, UVs, materials, lighting, shadows, shaders, sky/environment and particles | Primitive parameters survive save/export; instances remain independent; missing assets fail clearly; bounds align with collision; resources released and performance measured |
| Animation | Skeletons, clips, blending, locomotion and animation events | Movement and animation remain consistent through transitions; gameplay must not depend on render frame count |
| Audio and interface | Spatial sound, mixing, HUD, menus, settings, readable feedback and accessibility | Pause/focus behavior, volume persistence, equivalent non-audio feedback and controller navigation |
| Content and project management | Project manifest, scene switching, asset references, templates, search, property validation, dirty state, backups and migrations | Old project migrates without identity loss; malformed or interrupted operations preserve recoverable content |
| Behavior architecture | Explicit C# behavior registration, lifecycle, composition, events and editor validation | Setup/teardown order, missing references, deleted objects and repeat play cycles; two games demonstrate a reusable boundary |
| Game progress and databases | Player saves separate from authored scenes; SQLite-backed RPG content, transactions and migrations | Failed purchase rolls back; older player saves remain usable; credentials never belong in a shipped client |
| Production delivery | Profiling, debugging tools, automated checks, project builds, asset packaging and native export | Exported game launches without editor files on every claimed platform, including the user's Mac |

Rendering and physics dependencies need tested authoring spikes when their integration becomes necessary. Teach a small mechanism first, then compare a production library's responsibilities and costs. Do not imply the graphics binding supplies an entire game engine. Do not promise platform support from a successful Windows build.

The [asset workflow plan](3d-studio-assets-plan.md) makes built-in low-poly construction and imported models core paths through the same scene/project system. Introduce a small primitive palette early so the first game can be built with original in-studio assets; extend compound props and imports through the genre projects.

## Immediate playable sequence

Each row becomes short lessons with a runnable milestone, prediction, deliberate failure, independent change and evidence of transfer. Keep existing Foundations paths and progress keys stable. Add future discovered chapters only when there is actual authored content and a reviewed prerequisite profile.

| Next milestone | Visible result | Acceptance cases and C# depth |
| --- | --- | --- |
| Small authored room | Extend the demonstrated box workflow with primitives and materials needed for a room | Keep visual exploration before the data contract; preserve independent instances, history and saved parameters. Other shape types remain planned. |
| Isolated Play/Stop | Enter Play with independent runtime data; Stop returns to the authored scene | Move runtime objects, stop, compare exact authored IDs/positions/selection/history; repeat and reject invalid transitions. Teach object lifetimes, ownership and copying before a generalized lifecycle interface. |
| Movement and simulation time | Control a player in a 3D room, pause, restart and replay a short input trace | Compare equal simulated duration across render rates; bounded catch-up; invalid time values; normalized diagonal movement. Teach values versus state, numerical error and testable update functions. |
| Collision and goals | Ground, walls, a collectible beacon and an exit produce a playable loop | Stand/jump/land, blocked paths, triggers firing once, lose/win/restart. Teach geometric tests, state machines and lifecycle cleanup. |
| Author the beacon playground | Scene markers define player start, hazards, collectibles and exit | Save/reopen; reject missing/duplicate starts and dangling references; Play reads the same authored data without changing it. Introduce typed behavior settings and format migration. |
| Put the learning bot in that playground | Human, baseline and learned policies act through the same rules | Deterministic transition fixtures, headless training, frozen visible evaluation, fair information access and reset. Introduce a controller contract because actual interchangeable controllers now exist. |
| Standalone game project | Export the authored playground and launch it independently | Same rules and scenario fixtures in editor Play and runner; missing content has actionable diagnostics; no editor-only dependency. Teach project manifests and packaging. |

The first complete game should contain a goal, failure or challenge, feedback, restart, saveable authored content and a standalone build. A moving cube or a successful training log alone does not meet that gate.

## Keep Q-learning interesting throughout

| Stage | Game connection | Concepts and evidence |
| --- | --- | --- |
| Available early experiment | Fixed-world Beacon Bot | Tabular updates, exploration, terminal handling and frozen evaluation; calculations and tested seeds already authored |
| Authored environment | Beacon playground from scene markers | Validate the state/action/reward model; compare random, rule-based and learned controllers using the same observations and action rules |
| Inspect learning | Bot training/debugging tools in the studio | Episode/reward/success/length curves, coverage, Q-values, policy arrows, pause/step, repeatable configuration and recorded failures; keep training and evaluation labeled separately |
| Meaningful experiments | Different beacon layouts and puzzle conditions | Learning-rate/discount/exploration choices, reward shaping and unintended incentives; distinguish seed variation from unseen layouts and avoid tuning on the final evaluation set |
| Reusable policies | Saved bot configuration and learned values | Version the table with state/action encoding and environment metadata; reject incompatible policies and separate authored content, episode state and learned parameters |
| New spatial demands | Vertical routes, platforming decisions and racing drivers | Include height, velocity, headings or switches when they affect decisions; discretization/partial observation/state explosion; compare BFS/A* and rule-based control before assuming RL is preferable |
| Function approximation | A game where the table becomes inadequate | Introduce numerical arrays, linear algebra, gradients and a small C# approximator with finite-difference checks; show when approximation loses a previously exact distinction |
| Deep Q-learning | Discrete-action racing or arena bots | Replay buffer, target network, terminal/truncation targets, batch learning, target leakage and overestimation; compare with tabular and non-learning baselines on separately defined evaluation scenarios |
| Further control and competition | Continuous controls or multiple opponents | Explicitly teach a suitable continuous-action or policy method before claiming continuous steering is solved; opponent diversity, reproducibility, robustness and training budgets |

Keep the required implementation path in C#. If a later library or training tool cannot support that path, resolve and document the tradeoff before authoring the lessons. A Python training/export comparison may be an explicitly labeled extension, not a surprise language switch.

Training needs bounded work, responsive controls, cancellation and cleanup when it grows beyond the current tiny experiment. Teach async/await and thread ownership at that point; training workers must not issue graphics calls. Build telemetry from real samples and name missing evidence rather than fabricating a smooth learning curve.

## Deep C# and engineering, tied to these projects

| Concrete pressure | C# topics to teach | Question learners must answer |
| --- | --- | --- |
| Scene data and compatibility | Records/classes/structs, equality, nullable references, pattern matching, collection interfaces and generics | What is copied, what is shared, and which mutations are possible through each reference? |
| Replace controllers or persistence | Interfaces, polymorphism, composition, constructor injection, generic constraints and contract tests | What can be substituted, which semantic promises remain, and is a concrete implementation sufficient here? |
| Query scene content | IEnumerable/IEnumerator, iterators, LINQ and materialization | When does work happen, how often is it repeated, and can enumeration observe mutation? |
| Notify panels and behaviors | Delegates, lambdas, closures, events, subscription lifetime and command design | Who owns the subscriber and its captured state; what prevents notifications after teardown? |
| Load resources and import assets | IDisposable, using, native handles, ownership, exceptions and diagnostic boundaries | What releases the resource on every path, and why is garbage collection not timely cleanup? |
| Train or load without blocking | Task, async/await, cancellation, synchronization, queues and thread affinity | Which state may be shared, what makes cancellation complete, and which thread owns graphics? |
| Meet measured performance needs | Complexity, profiling, allocation/GC, pooling, Span/Memory, value layout and data-oriented tradeoffs | What measurement justifies the complexity and which correctness invariant must survive optimization? |
| Maintain multiple games | Assemblies, dependency direction, versioning, testing, design alternatives and refactoring | Which boundary has evidence of reuse and how does a change propagate through the games? |
| Release and support software | Git, review, CI, requirements, issue planning, licensing, security boundaries, platform diagnostics and release recovery | Can another developer reproduce the build, understand a failure and safely deliver a change? |

Introduce P/Invoke and unsafe/native memory only where a native integration exposes the need. Teach the responsibilities of the managed/native boundary before encouraging low-level optimization. Language complexity must have a concrete benefit, an alternative and a regression case; interfaces and patterns are not a badge of quality by themselves.

## Games earn the remaining systems

Beacon Island establishes the full author-play-export loop. Racing adds track/kart authoring, vehicle motion, materials and chase-camera tuning while revisiting learning controllers. Platforming earns transforms, collision robustness, moving platforms and animation. Puzzles earn references, event wiring and state-space experiments. Strategy earns navigation, graphs, spatial indexes and performance measurement. The RPG earns relational data and recovery. Action earns asset/animation work, responsive opponents and profiling. Simulation earns deterministic scheduling and large interacting state. An independent capstone requires the learner to assemble and release a game without a complete supplied solution.

Multiplayer, visual scripting, editor plugins, hot reload and collaborative editing are later extensions after the single-player workflow is independently usable. They need their own learning and platform evidence and must not hold the first playable release hostage. Advanced renderers and large open worlds also require explicit scope and measured constraints rather than an implied promise to match commercial engines.

## Quality gates for calling an arc complete

- A clean author reconstruction builds and executes every required milestone; plausible wrong implementations fail behavior assertions rather than compilation alone.
- Manual native play verifies the defining game interaction, input, focus, restart and cleanup; screenshots and headless tests are labeled for what they establish.
- An introductory learner predicts, explains a failure and independently changes a small feature. Use the [pilot guide](3d-studio-teaching-pilot.md), record help, revise confusing lessons and repeat a fresh case.
- The authored scene, editor Play and standalone runner agree on tested rules. A genre requires its defining mechanics, not a renamed beacon demo.
- Persistence, asset compatibility and resource cleanup have selected failure/recovery cases. Export works on every platform actually claimed.
- Each arc names prerequisites, independent evidence and remaining limitations. Automated checks and copying do not imply mastery or a production-ready editor.

The immediate priority is the isolated Play/Stop sequence above, followed by the authored beacon game and integrated learning bot. Expand 3D production features through those playable destinations rather than delaying games until the entire feature matrix is implemented.
