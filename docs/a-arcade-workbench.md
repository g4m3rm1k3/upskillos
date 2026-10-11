# A-Arcade workbench

First standalone implementation, 2026-10-11. Open A-Arcade in the lab catalog or `#/lab/a-arcade`. No existing lab or Q-Arcade lesson is changed.

## Learning approach

Start with a supplied learned CartPole policy already acting, remove components, inspect one experience and one numerical update, reconstruct a learner, then explore CartPole A2C and transfer Q-learning to QMaze. Every component card includes a definition, small worked example, transferable abstraction, input/output contract, removal consequence and experiment. The list/row/index card explains the underlying data structure separately from Q-learning.

The five-phase runner exposes Observe, Represent, Choose, Act and Learn. Single-operation stepping follows the relevant explanation. Inspector data comes from the actual executed transition. Replay preserves recorded observations and arithmetic; it does not reverse the current model. Live table data is explicitly distinguished from the saved pre-action row. Control changes pause and discard incomplete transitions/rollouts.

## Implemented scope

- Dependency-free JavaScript learning engine and SVG environment rendering, suitable for the browser and Electron renderer. The scroll area belongs to the lab, including inside a maximized or resized desktop window.
- CartPole dynamics use the standard Gymnasium constants, 0.02-second explicit Euler integration, +1 reward including terminal steps, failure at cart position beyond 2.4 m or pole angle beyond 12 degrees, and a 500-step external cutoff. Terminal states mask bootstrap; time limits retain it.
- Tabular Q-learning with configurable epsilon, alpha and gamma; removable observation velocities, state representation, learned action selection, reward and learning.
- A2C uses an explicit logistic linear actor and polynomial linear critic. Eight environments collect five transitions each before a synchronous update. Analytic gradients, entropy bonus and gradient norm clipping are visible in the downloadable engine. It is deliberately a small function approximator, not a hidden-layer neural network or a wrapper around an RL library.
- A2C inspector shows probabilities, features, actor and critic weights, per-transition return/baseline/advantage, losses, gradients, clipping and weight changes. Removing the critic or entropy bonus is supported; the no-critic ablation is explicitly identified as an incomplete learner.
- A fixed QMaze with walls, step cost and a goal uses the same Q update. It teaches transfer of the interface and algorithm, not generalisation of a trained policy to unseen mazes.
- Frozen evaluation on seeds 901–920 leaves the live learner and RNG untouched. Maze seed repetitions are identical because the maze has a fixed start and deterministic dynamics.
- Local self-reported chapter completion, experiment JSON export and standalone engine source download. Source is read-only in this first version; reconstruction uses executable component switches.

## Supplied learned snapshots

Regenerate `src/labs/a-arcade/snapshots.json` with:

```sh
node src/labs/a-arcade/train-snapshots.mjs
```

The generator uses the same engine as the UI, seed 7, and checkpoint selection on seeds 101–105. Metadata records the training checkpoint and selection score. This is demonstration checkpoint selection, not independent evaluation. There are no hand-coded balancing rules hidden behind the learned policy.

## Follow-up scope

Native Python/pygame execution, editable code with safe execution and trace correspondence, larger neural actors/critics, user-defined environments and additional task families are not implemented in this first version. The current deliverable is a real executable explorer, not the full programming curriculum. Python and existing Q-Arcade remain separate.

## Verification

Commands run:

| Command | Result |
|---|---|
| `node src/labs/a-arcade/train-snapshots.mjs` | CartPole checkpoint at episode 1500, selection mean 500; maze checkpoint at episode 100, selection mean 0.86; A2C checkpoint at update 700, selection mean 500. |
| `npx vitest run src/labs/a-arcade src/data/catalogNavigation.test.js src/routes.test.js` | `Test Files 3 passed (3)` and `Tests 17 passed (17)`. Vite printed existing esbuild/oxc deprecation warnings. |
| `npm run typecheck` | Exit 0, no diagnostics. |
| `npm run facts` | Generated title/id maps and current project facts; reported the existing content problems listed in the generated inventory. |
| `npm run catalog:check` | Title map, id map and project facts are current; the generated inventory's existing content-problem warning remains. |
| `npm run docs:check` | `Contributor docs checked: 10 file(s), links, paths and commands all exist.` |

The first Vitest attempt hit a sandbox temporary-file rename `EPERM`; rerunning with process-local `TEMP` and `TMP` set to `node_modules/.cache/a-arcade-tmp` passed. The first production build hit a sandbox `EPERM` resolving an existing Game Studio file and was retried outside that sandbox.

Engine tests cover physics symmetry and a numerical reference, maze walls/goals, bounded state indices, hand-calculated TD updates, terminal/truncation boundaries, held-out supplied-policy behaviour, return construction, gradient direction, critic removal, frozen previews, stable replay, component restoration and synchronous rollout sizing.

Browser checks verified the discovered floating lab, maximizing, mouse/keyboard scrolling, individual operations, actual source display, rebuilding an empty learner (first selected Q value changed from 0 to 0.12), a 40-transition A2C batch and one update, evaluation, and the learned eight-action QMaze route terminating at the goal. No browser console errors were reported during these checks.

Separate engine evaluation of the unmodified supplied policies on seeds 901–920: Q-learning mean length 500, all runs reached the time cap; A2C mean length 470, eleven runs reached the time cap. These are small controlled demonstrations, not a claim of universal reliability. The packaged Electron executable has not been rebuilt or manually tested.
