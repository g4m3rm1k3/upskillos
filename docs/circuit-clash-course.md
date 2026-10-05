# Circuit Clash: playable reference and standalone engineering course

## Status

The browser reference and Project Studio opening lesson are implemented. The C# implementation course is **not complete**; do not market the introduction as a finished series. No C# engine has been locked in by adding this browser reference. The reference uses existing React/Three.js dependencies and is intentionally labeled as a separate implementation of the target behavior.

Play `#/game/circuit-clash`. In Project Studio choose **Circuit Clash — C# Software Engineering (course in development)**, then **Play Circuit Clash — the game you will learn to build**. The first step launches the game without setup, a prerequisite course, a completed challenge or supplied learner source files.

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

## Remaining work

- Choose and verify the C# engine/toolchain and supported learner platforms with a minimal built-and-packaged project.
- Author and execute the standalone foundations and complete guided build, including code-level explanations comparable to the Pygame/PySide reference lessons.
- Establish executable behavioral parity between learner implementation and browser reference without requiring identical source architecture.
- Audit pacing, accessibility, controls and driving feel with learner feedback. Do not call automated simulation a substitute for playtesting.

Primary rendering reference: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). Engine selection must account for export targets; [Godot's C# web-export limitation](https://docs.godotengine.org/en/4.4/tutorials/export/exporting_for_web.html) is one reason not to label this browser implementation a Godot C# export.
