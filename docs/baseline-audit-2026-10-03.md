# Baseline install and Studio audit — 2026-10-03

Investigated the six reported problems in the current checkout. This audit does not establish which commit introduced them or compare an ML PR against `main`.

## Results

| Report | Finding and action |
| --- | --- |
| Lockfile / `npm ci` | Reproduced with npm 11.21.0 in an isolated folder. Missing peers included `@emnapi/core`, `@emnapi/runtime`, `jsdom`, and then two CSS parser dependencies. npm 11.6.2 accepted the older lock, so a successful install with that version did not settle the issue. Regenerated the lock with npm 11.21.0 until clean installation succeeded. Package versions already present in both locks were preserved; obsolete orphaned esbuild platform entries were pruned. The lock also now matches the existing exact `node-pty` pin in `package.json`. |
| Spreadsheet route false positive | Confirmed. The scanner interpreted `/src/style.css` in an intentionally broken learner HTML answer as app navigation. Excluded `*.walkthrough.*` data alongside test files. App source still gets scanned, including the existing assertions that meaningful routes were found. No spreadsheet lesson or course loader changed. |
| Missing Game Studio runtime | Normal production build passed in an isolated checkout populated from `git archive HEAD`, with separately installed dependencies and no preexisting generated runtime. `npm run build` invokes `game:runtime` before the app build. Direct `vite build` bypasses that prerequisite. |
| Catalog findings | Catalog check passes with the reported 14 findings. They are published lesson ID collisions between Calculus and Precalculus. Progress uses course-qualified keys, so these pairs do not share course progress. Resolving globally ambiguous IDs requires an explicit compatibility migration; this audit preserves IDs and URLs. |
| Combined Studio tests | No full-suite deadlock established. The unit/UI group finishes with two workers. Inside the filesystem sandbox, all assertions passed but deletion of a temporary Git folder failed with `EPERM`; the same group passes outside the sandbox. Cleanup retries did not resolve the restriction and were reverted. The C++ foundations walkthrough also passed. The full folder includes compiler/CMake builds, Python environment setup, network package installs and browser walkthroughs; some individual command/test limits are 15 minutes. Those external workloads should be run with bounded workers and verbose progress. The entire desktop walkthrough suite was not run. |
| Matplotlib | A Chrome probe on the live site's origin loaded Pyodide 0.29.3, loaded matplotlib 3.8.4 and created a plot. The live ML “What learning is” notebook then opened, showed its lesson text and finished runtime loading without the failure banner. Restricted network access fails in the sandbox. Current runtime code already uses the version-matched CDN for package wheels because the bundled npm runtime does not include them. This is evidence for an environment-dependent failure, not an exhaustive notebook audit. |

## Verification

The environment provides Node but no npm/npx command. Downloaded npm CLIs into temporary folders and invoked their `npm-cli.js` directly. Workspace `node_modules` was not replaced. Clean installs used temporary folders containing the root manifests and the OpenMat workspace manifest; lifecycle scripts were disabled for these dependency-resolution checks.

- `node <npm-11.21.0-cli> install --package-lock-only --ignore-scripts --no-audit --no-fund --cache <temporary-cache>`: completed; repeated after the first clean install exposed additional missing transitive peers.
- `node <npm-11.21.0-cli> ci --ignore-scripts --no-audit --no-fund --cache <temporary-cache>`: **added 1072 packages in 38s**, exit 0, in the isolated Windows install.
- The same clean install with `--os=linux --cpu=x64`: **added 1077 packages in 45s**, exit 0. This checks Linux dependency selection from Windows; it is not a Linux execution test.
- `node <npm-11.6.2-cli> run build` in the isolated archived checkout, with a temporary npm command shim for nested scripts: **built in 2m 36s**, exit 0. Includes generated Game Studio runtime. Existing warnings mention large chunks, mixed static/dynamic imports, Browserslist data, dependency annotations, and a CSS syntax warning (`-3: -1`).
- `node node_modules/vitest/vitest.mjs run src/routes.test.js`: **1 file passed, 2 tests passed**, 1.01s. Before the fix: 1 failed / 1 passed and the reported spreadsheet path, about 30s.
- `node node_modules/vitest/vitest.mjs run src/labs/project-studio --exclude '**/*.desktop.test.js' --maxWorkers=2 --reporter=dot` outside the filesystem sandbox: **19 files passed, 93 tests passed**, 18.91s. Sandbox run: the same 93 assertions passed, one suite failed in cleanup. Existing React key and Vite deprecation warnings remain.
- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/cppFoundations.desktop.test.js src/labs/project-studio/projectChecks.test.js --maxWorkers=1 --reporter=verbose`: **19 assertions passed**, including all five compiled foundation lessons; sandbox Git cleanup caused one suite failure. Not counted as an overall passing command.
- `node <npm-cli> run catalog:check`: titles, ID map and facts current; **14 content problems** listed in the generated inventory; exit 0.
- `node <npm-cli> run docs:check`: contributor links, paths and commands exist; exit 0.
- Temporary Playwright/Chrome probe on `https://upskillos.io/`: matplotlib version **3.8.4**, **one figure**. Live `#/notebook-lab?lesson=ml-what-learning-is`: **loaded: true, runtimeFailed: false**. The probe closed its browser; no development server was started.

Only the lockfile and route scanner require changes for these confirmed install/navigation-check defects. No course structure, published lesson identity, or learner project files were edited by this audit.
