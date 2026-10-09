# Circuit Clash: playable reference and standalone engineering course

## Status

The browser reference and complete guided C# implementation are authored. The learner types the native game from small explained fragments, starting with execution and values and ending with tests, training/evaluation, and packaging. The engine choice is **.NET 10 + Raylib-cs 8.1.0**. The browser reference remains a separate React/Three.js implementation of comparable behavior.

Play `#/game/circuit-clash`. In Project Studio choose **Circuit Clash — C# Software Engineering**. The first step launches the sample before setup. The course does not require the Java/Python series, generated solutions, or successful optional challenges. The catalog marks it **Review pending**: executable reconstruction and Apple silicon verification are complete; beginner pacing and other desktop platforms still require learner testing.

## Reference scope

- Original third-person kart racer, winding elevated circuit, chase camera and free steering.
- Ordered checkpoints, two laps, collisions, off-road penalty, recovery, countdown, pause and results.
- Three rivals using the same weapon and energy rules as the human player.
- Homing rockets when a forward target is available, dropped mines, temporary shields, boost and equipment pickups.
- Garage with persistent local credits, owned packages, equip selection and speed/handling/protection tradeoffs.
- Actual trained tabular Q-learning for tactical actions. Steering is a scripted waypoint controller.
- Training against scripted rivals and frozen policy snapshots; evaluation uses separate seeds. Policies do not update during a human race.
- Menu comparison and a repeatable browser-worker training experiment. No claim of general superiority.

Physics is deliberately arcade-style: horizontal driving attaches the kart to the sampled track height. This is not a rigid-body suspension simulation; visible elevation does not imply a complete tire or gravity model. Finishing ends the player's race; unfinished opponents are ranked by checkpoint progress. Rendering and simulation are separate. Fixed simulation steps avoid changing game rules with display refresh rate. Long browser stalls are clamped, so simulation slows rather than catching up without bound.

## Source and verification

- [Simulation](../src/games/circuit-clash/simulation.js): browser-independent state transitions, equipment, checkpoints, Q updates and garage validation.
- [Training](../src/games/circuit-clash/training.js): seeded episodes, frozen opponents and held-out comparison.
- [Policy author tool](../src/games/circuit-clash/train-policy.mjs): run `node src/games/circuit-clash/train-policy.mjs` to regenerate the policy and evaluation artifact. Do not manually edit generated Q values.
- [Renderer](../src/games/circuit-clash/scene.js): geometry, lighting, camera and resource disposal.
- [Opening lesson](../src/labs/project-studio/tracks/circuit-clash/00-play-the-game.md): sample launch, observation tasks and honest course status.

The release checks must cover a completed race, weapon effects and shields, checkpoint order/recovery, garage purchase/equip/save validation, Q terminal versus truncated updates, deterministic training, menu flow, focus pause and a real browser rendering check. A screenshot or a green parser check cannot establish game completeness or teaching quality.

## Course authoring contract

The course assumes minimal experience and no Java/Python series. All learner implementation code is typed in small explained increments. No source injection or unexplained starter bundle. Introduce execution, values, declared types, expressions, control flow and functions before classes, interfaces and collections. Explain syntax, execution order, state changes, design choices, alternatives and failure cases. Analogies supplement these explanations.

The build proceeds through terminal/Git and C# foundations; testable models; a first 3D kart; complete racing; menus/state transitions; combat; a persistent garage; data structures and algorithms; tactical learning; evaluation; packaging and release investigation. Teach TDD with meaningful failures and counterexamples to bad tests. Introduce patterns only when an experienced limitation motivates them. Use repeated applications and later transfer problems rather than a single successful exercise as evidence of understanding.

Core behavior in the reference must be implemented in the guided path. Optional challenges cannot hide required features or prerequisites, must not gate navigation, and should preserve a working guided project when deferred. Software development with coding agents belongs in a later course; RL opponents belong here.

## Guided implementation and verification workflow

The sequence lives in [the discovered Project Studio track](../src/labs/project-studio/tracks/circuit-clash/00-play-the-game.md). Its required edit fragments create Scratch experiments, a graphics-independent Core library, a native Game executable, and a Checks executable. No support bundle or hidden insertion supplies learner implementation code. The renderer teaches local/world coordinates, transforms, indexed triangles, winding, normals, flat diffuse lighting, a chase camera, road ribbons, wheels, and scenery.

Run `node scripts/check-circuit-clash-course.mjs --dotnet /path/to/dotnet --keep` to reconstruct the published fragments into a new temporary author workspace and execute the taught milestones. Omit `--dotnet` to use the SDK on PATH and `--keep` to remove the workspace afterward. The checker executes the intended compiler/runtime failures and red assertions, their repairs, intermediate builds, and the final regression runner. It then deliberately mutates representative rules, requires the correct assertion failure for each mutation, restores the source, and rebuilds/runs the restored checks. This is author verification only; it is not wired to fill a learner's editor.

The native course deliberately differs from the browser sample in presentation: Raylib receives CPU-shaded generated triangles; input is desktop keyboard driving and pointer/keyboard menus; held-out evaluation is printed as CSV. Steering is scripted in both versions. Q-learning chooses legal equipment actions, and policies do not update during human races. The course explicitly documents arcade height attachment, discrete collisions, a fixed desktop layout, and local persistence. It does not claim a browser export, rigid-body vehicle physics, general optimal learning, or identical numerical outcomes across implementations.

See [the prerequisite and readiness audit](circuit-clash-course-audit.md) for coverage, corrections and the remaining learner review.

## Remaining review

- Audit pacing and comprehension with learners starting from minimal experience; automated reconstruction cannot establish teaching quality.
- Test native setup, graphics, controls and published artifacts on Windows, Linux, and Intel macOS. Only Apple silicon macOS has been exercised here.
- Review accessibility and human driving feel. The native UI supports keyboard menu navigation but does not claim screen-reader integration or a responsive layout.

## Course verification — 2026-10-08

- `DOTNET_CLI_HOME=/tmp/circuit-clash-cli NUGET_PACKAGES=/tmp/circuit-clash-nuget node scripts/check-circuit-clash-course.mjs --dotnet /tmp/circuit-clash-dotnet/dotnet --keep`: printed **PASS reconstructed course** after every executed milestone. The published fragments compiled at their designated boundaries. Negative-index and Q-arithmetic stubs failed with the intended assertion messages, not compiler errors; their replacements passed. The final Checks executable printed **ALL CHECKS PASSED**.
- `npx vitest run src/games/circuit-clash src/labs/project-studio/StudioNavigation.test.jsx src/labs/project-studio/circuitClash.test.js src/routes.test.js`: **5 test files passed; 25 tests passed**. Covers browser gameplay, course discovery/navigation, small typed fragments, optional-work independence, progress-key uniqueness, and author reconstruction boundaries.
- `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"`: **2 failed, 172 passed** across **2 failed and 33 passed test files**. Remaining failures are the existing Git repository detection assertion in `projectChecks.test.js` and child-process termination assertion in `projectIsolation.test.js`. Course, catalog-profile, and navigation checks passed. This is not a green full-folder run.
- `npm run docs:check`: printed **Contributor docs checked: 9 file(s), links, paths and commands all exist**. `git diff --check` printed no whitespace errors. No full SPA production build was run for this content change; the native learner artifact was built and published separately.
- From the reconstructed workspace, `dotnet publish Game/Game.csproj -c Release -r osx-arm64 --self-contained true -o artifacts/osx-arm64 -p:UseSharedCompilation=false`: restored the official runtime packages and emitted the self-contained Game output. The first sandboxed restore could not resolve NuGet; the authorized network-enabled retry succeeded.
- `artifacts/osx-arm64/Game --train --data=play-data`: printed progress through **Trained 600/600**. `artifacts/osx-arm64/Game --evaluate --data=play-data` emitted held-out CSV results. All evaluated players finished. Scripted mean time/place were **31.88 seconds / 1.92**; learned means were **34.02 seconds / 1.00**. These measurements illustrate the aggressive reward tradeoff, not a universal advantage.
- `artifacts/osx-arm64/Game --capture --data=play-data`: opened Raylib/OpenGL on Apple M4, rendered the generated track, kart and landscape, saved `native-race.png`, and closed automatically. The published-window capture showed the focus-loss pause screen over the rendered world. This is a rendering/focus smoke check, not a complete manual-controls or driving-feel review.
- Browser verification opened the discovered course and inspected the transform and face-normal lessons, including the explanatory prose and typed C# blocks. No source was injected into the learner editor.
- `npm run facts` and `npm run catalog:check`: regenerated metadata and reported current inventory, with the existing **14 content problems** recorded in the generated inventory.

## Verification record — completed 2026-10-06

- `npx vitest run src/games/circuit-clash src/labs/project-studio/StudioNavigation.test.jsx src/labs/project-studio/circuitClash.test.js src/routes.test.js`: **5 test files passed; 22 tests passed**. This covers the race rules, real policy regeneration and evaluation, garage transactions, keyboard input, focus pause/resume, demo completion, resource cleanup, discovery and introduction navigation.
- `node src/games/circuit-clash/train-policy.mjs`: regenerated the shipped artifact from 600 simulated training races. It printed 41,339 updates and 192 visited states. Held-out mean times were 34.54 seconds for the learned policy and 32.95 seconds for scripted tactics. The learned policy's mean place was better (1.75 versus 2.08), illustrating why one metric is insufficient. These are this experiment's results, not a promised advantage against humans.
- An additional headless sweep over seeds 0–99 finished every player's demonstration race; observed finish times ranged from 33.60 to 46.32 seconds.
- `npm run facts` and `npm run catalog:check`: regenerated metadata and confirmed it was current. Both reported the existing 14 duplicate-ID content problems in the generated inventory, outside this sample.
- `npx vite build --config /tmp/circuit-clash-build.config.mjs`: **built in 4.67 seconds**. This was an isolated production bundle of the game, CSS, Three.js and training worker, with React and the existing lab-opening adapter external. It was not a full application production build. The temporary configuration did not change repository build scripts.
- `npx vitest run src/labs/project-studio`: **20 failed, 218 passed, 204 skipped** across the full folder. Failures included existing Forge lessons with multiple `file=` blocks, native C++ walkthrough/environment checks, Git-root expectations, process termination and a desktop mock unable to resolve `process-tree.cjs`. The new sample and its navigation checks passed separately; this result must not be described as a green full-suite run.
- Browser verification: observed a complete third-person demonstration race, combat/block feedback and the finish screen; purchased a turbo package; ran the training worker to completion and inspected its comparison table; opened the Circuit Clash introduction from the game; and followed the introduction's launch link back to the playable game. The lesson remained available in its own window. Manual keyboard acceleration and focus pause were additionally exercised in the component tests; automated driving is not a human driving-feel review.

The record above describes the earlier browser-sample verification. The later native-course verification and remaining review are recorded separately above.

Primary rendering reference for the browser sample: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). The native course uses .NET 10 and Raylib-cs 8.1.0, as its first lesson sets up; only macOS on Apple silicon has been verified so far. Engine selection had to account for export targets; [Godot's C# web-export limitation](https://docs.godotengine.org/en/4.4/tutorials/export/exporting_for_web.html) is one reason not to label this browser implementation a Godot C# export.

## Live typed-code comparison

Circuit Clash opts into `typedDiff: true` in its opening lesson. Project Studio derives each required edit's complete reference from preceding replace/append fragments, then uses the same `DiffBlock`, editor match indicator, and line comparison as the other series. Explanations remain on either side of the reference. References never populate the learner's editor; optional experiments do not enter subsequent targets. Matching checks transcription, while the existing executable checks establish behavior. Navigation remains nonblocking. Without an open desktop project, the browser shows a labelled preview against the previous guided step; it does not pretend to have read the learner’s files.

The derivation is implemented in `src/labs/project-studio/typedDiffTargets.js` and tested against every required Circuit Clash fragment, including cross-lesson accumulation, replacement, independent files, optional work, and live mistake/correction feedback.

## Completion audit verification — 2026-10-08

- `DOTNET_CLI_HOME=/tmp/circuit-clash-cli NUGET_PACKAGES=/tmp/circuit-clash-nuget node scripts/check-circuit-clash-course.mjs --dotnet /tmp/circuit-clash-dotnet/dotnet --keep`: completed **62 executed milestones**, printed **PASS 6 deliberate mutations detected; restored source passes**, and finished with **PASS reconstructed course**. This run includes the new saved-data, action-legality and hazard assertions. After all mutations, a nonincremental build and `Checks --no-build` passed. The preserved author workspace was `circuit-clash-walkthrough-cBURYf` under the operating system temporary directory. This is author evidence, not code inserted into a learner project.
- `npx vitest run src/labs/project-studio/EditorPane.test.jsx src/labs/project-studio/typedDiffTargets.test.jsx src/labs/project-studio/circuitClash.test.js src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/StudioNavigation.test.jsx src/games/circuit-clash src/routes.test.js`: **8 files passed; 41 tests passed**. Covers the course, browser game, navigation, reference construction, preview labelling, extra-line mismatch, and an empty editor remaining empty despite a reference target.
- `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"`: **36 files passed, 2 failed; 180 tests passed, 2 failed**. The failures remain `projectChecks.test.js` → “follows a repository from init to push” and `projectIsolation.test.js` → “Stop ends the program and anything it started.” The later added preview-label assertion passed in the focused run above. No tests were disabled to obtain a green result.
- `npm run docs:check`: **Contributor docs checked: 9 file(s), links, paths and commands all exist.** `npm run catalog:check`: titles, IDs and project facts are current; the existing **14 content problems** remain listed in the generated inventory. `git diff --check`: no whitespace errors.
- Browser verification opened the type-diagnostic lesson and the final regression lesson. The typed-code diff rendered. In browser-only mode, an appended purchase test showed **4 new lines** with earlier lines folded and an explicit previous-guided-code preview label, rather than presenting the whole accumulated file as new work. Desktop live mismatch/match behavior was exercised in component tests; no claim of a new Electron end-to-end run is made.
- An intermediate restoration attempt encountered a missing compiler reference artifact (`CS0006`). A clean nonincremental build succeeded with **0 warnings and 0 errors**; the final integrated replay above also rebuilt and passed after mutation restoration. No source workaround or weakened assertion was used.

The completion audit did not rerun a native visual/playability review on other operating systems, nor a full application production bundle. Prior native rendering/publishing evidence and remaining human/platform review still apply.
