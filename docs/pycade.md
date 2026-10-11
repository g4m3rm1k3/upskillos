# PyCade: the Python program, its world, and its memory

Open **PyCade** in the lab catalog (`#/lab/pycade`). This is a separate lab; A-Arcade and A-Arcade Breakdown are unchanged.

The intended first session is:

1. See the whole observe → choose → act → learn → repeat loop and its complete Python program.
2. Jump to a real `env.step` result. Open its five labeled slots, then the four observation measurements. Click a value to see its role, its current value, its indices, and the statement that last changed its container.
3. Step through one update. Read the Python expression, its mathematical translation, and the numbers substituted from that run. Back replays historical snapshots; it does not reverse the environment or train again.
4. Follow a prerequisite in the adjacent explanation panel (tuple → unpacking → indexing, or advantage → return → reward). Breadcrumbs return to the original explanation while the program remains visible.
5. Change `alpha` to `1.0` in Q-learning or `gamma` to `0.0` in A2C. Predict the outcome, then run native Python and inspect the new trace.

## Actual execution

The downloadable, editable source lives in `src/labs/pycade/python/`. Q-learning uses NumPy and Gymnasium CartPole. A2C uses two independent Gymnasium CartPoles, PyTorch actor/critic networks with hidden layers, four-step rollouts, masked bootstrapped returns, entropy regularization, gradient clipping and Adam. Eight transitions contribute to each synchronous update. The tiny runs teach the algorithm; neither is presented as a trained balancing agent.

`tracer.py` uses Python's tracing API to snapshot learner statements **after execution**, including functions and methods defined in the supplied file. Library internals are explained using API contracts and formulas, not represented as if each C/Python library instruction were traced. NumPy arrays, tensors, list/tuple/dictionary structure, network parameters and gradients are captured from the real objects. Snapshots store deltas; replay reconstructs immutable historical memory. Source and package versions are embedded in every trace. The trace stops after 2500 statements or 30 seconds measured at learner statement boundaries; it is not a security sandbox or a timeout for arbitrary blocking library calls.

The browser initially loads checked-in recordings made by this same tracer, clearly labeled as recordings. It does not substitute a JavaScript learning engine. In Electron, **Run Python & capture trace** sends the displayed editor source and tracer to the existing native notebook kernel and displays its returned trace. **Choose Python** uses that kernel's existing interpreter picker. Install the dependencies imported by the program in the selected environment. Plain Python requires no ML packages; the supplied ML examples together use:

```sh
python -m pip install numpy gymnasium torch
```

Use **Working folder** to choose where relative file paths and imports are resolved. The interpreter is shared with desktop notebooks. Wait for other notebook work before running. These short, synchronous captures finish before replay begins; stepping does not suspend a live Python process. No separate native pygame window is required: the lab draws the world from actual Gymnasium observations.

## Regenerate recordings

With the required libraries installed in the selected Python environment:

```sh
python src/labs/pycade/python/tracer.py src/labs/pycade/python/q_learning.py src/labs/pycade/q-trace.json
python src/labs/pycade/python/tracer.py src/labs/pycade/python/a2c.py src/labs/pycade/a2c-trace.json
```

These JSON files are generated; do not edit their values by hand. Unit tests check that their source exactly matches the downloadable programs.

## Verification

- `/private/tmp/rl-code-venv/bin/python src/labs/pycade/python/test_trace.py`: `Ran 4 tests` / `OK`. Checks actual Q update arithmetic and untouched cells, gradient-versus-weight timing, truncated-episode bootstrap targets, and bounded/error traces.
- Recording generation: `472 executed statements; error=None` for Q-learning, `333 executed statements; error=None` for A2C.
- `npx vitest run src/labs/pycade src/data/catalogNavigation.test.js src/routes.test.js`: `Test Files 3 passed (3)` / `Tests 10 passed (10)`. Existing Vite esbuild/oxc deprecation and Browserslist age warnings printed. The first attempt omitted the DOM environment annotation; corrected to the repository's happy-dom environment and reran successfully.
- `npm run typecheck`: exit 0, no diagnostics.
- Native Electron verification used an isolated temporary user-data directory and a temporary Python virtual environment: Q-learning, A2C and edited A2C (`gamma = 0`) all executed through the actual preload/IPC/kernel path. Renderer errors: `[]`. The first sandboxed launch was blocked; the permitted retry succeeded.
- Reproducible desktop check (with Vite on port 5189): `PYCADE_PYTHON=/private/tmp/rl-code-venv/bin/python VITE_PORT=5189 node src/labs/pycade/e2e/desktop.mjs`. Printed `Desktop q: native Python trace captured`, `Desktop a2c: native Python trace captured`, and `Desktop edited A2C: gamma=0 gives target=1; renderer errors: []`. Set the interpreter path to your environment when repeating it.
- `npm run facts`: regenerated inventory, facts and README facts; reported the inventory's existing content problems. `npm run catalog:check`: title/id maps and project facts are current; the existing content-problem warning remains.
- `npm run docs:check`: `Contributor docs checked: 10 file(s), links, paths and commands all exist.`
- `git diff --check`: exit 0, no output.
- Visual inspection caught and corrected viewport-relative sizing inside floating windows and an incorrect code-pane scroll offset. The lab now sizes to its own window and requests a larger initial work area.

Windows/Linux desktop execution and packaged release builds have not been checked. Recorded and native runs have been checked on macOS. This is a first working learning lab, not a claim that learner testing or a full Python curriculum is complete.


## More examples and automatic inspection (2026-10-11)

The program selector now also includes:

- **Gradient descent · fit a line:** NumPy predictions, residuals, mean squared error, hand-computed derivatives and parameter updates. A plot connects the training points to current predictions and their errors.
- **Neural classifier · scores to classes:** PyTorch logits, softmax probabilities, class indices, cross entropy, parameter gradients and SGD updates. Class indices are not labeled as CartPole actions.
- **Bandits · exploration and running averages:** compare exploration with exploitation, then inspect the exact running mean and count for each machine.
- **Your Python · automatic inspection:** paste a program or use **Load .py**. The initial ordinary-Python nearest-neighbor example uses functions and returned tuples without PyCade annotations.

These examples reuse one tracer and value renderer. A new program does not need a JavaScript implementation, registration in the engine, or specially named variables. Edited sources are retained while switching examples within the current lab session; they are not saved across reloads, so use Download .py to keep your work.

Automatic inspection is deliberately different from a guided explanation:

| Layer | What is known automatically | What still needs context |
|---|---|---|
| Python execution | Executed source lines, function/method call paths, visible globals and current locals, returned values, changed/removed variables, stdout | The purpose of a custom function or variable |
| Numerical structure | NumPy arrays, PyTorch tensors, shapes, dtypes, bounded values, named model parameters and gradients | Whether an axis means examples, actions, classes, time or worlds |
| Supported operations | Tensor mean/sum/square/detach/backward, PyTorch model calls and optimizer steps, plus syntax-level reads/assignments | The full algorithm, training objective, data meaning and whether the chosen method is appropriate |
| Guided examples | Authored plain-language explanations, numerical formulas, domain-specific plots and return-slot labels | Additional lessons still need authored teaching content |

For example, a five-item tuple in arbitrary code is shown as five ordered items. Its length does **not** identify it as Gymnasium's return contract. A variable named `q` or `obs` does not activate the CartPole visualization in custom mode. Runtime adapters recognize supported Python object types instead of relying on those names.

The general scalar history plot works with any recorded numeric variable. It plots changes through the current statement, not necessarily epochs. Clicking inputs/outputs selects their actual values; call-path labels show the active function. The source analysis reports syntax-level dependencies, not a complete causal graph through library internals.

Known bounds: only the submitted source file is traced; imported modules execute normally but their internals are not stepped. Other threads/processes and arbitrary blocking calls are not controlled. Unknown object types remain opaque; this is not universal introspection of every ML framework. Arrays/tensors over 256 elements are labeled flat previews, lists/dictionaries are limited to 32 items, models to 16 named parameter entries, nesting to five levels, and stdout to 8,000 characters. Non-finite numbers are represented as strings so they do not break JSON transport. Python tracing follows the [Python trace API](https://docs.python.org/3/library/sys.html#sys.settrace); the classifier follows the [PyTorch cross-entropy contract](https://docs.pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html).

Regenerate the additional recordings with the same tracer, using `regression.py`, `classifier.py`, `bandit.py`, and `custom.py` as input and the corresponding `*-trace.json` filenames under `src/labs/pycade/` as output.
