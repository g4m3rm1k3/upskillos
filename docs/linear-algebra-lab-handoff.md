# Linear Algebra Lab: session handoff

> **Active again (2026-10-18).** The owner un-parked the lab: it matters for their own work. They also asked to extend OpenMAT when a lesson needs it. Engine changes go in `packages/openmat/src` with a test in `packages/openmat/src/__tests__/engine.test.ts`; the app and the tests load the source directly, and `dist/` is untracked.

Start every Linear Algebra Lab session by reading this file, then the phase you are building in [linear-algebra-lab-gentle-plan.md](linear-algebra-lab-gentle-plan.md) (design rules and build order). [linear-algebra-lab.md](linear-algebra-lab.md) holds the older design notes and engine conventions. Don't re-read finished lesson files unless the new work touches them.

At the end of a session, update this file (state, next step, anything learned) and the plan's build-order entry, then stop so the owner can clear the chat. **One phase per session.**

## Rules (from the owner)

- **Labs are supplements, not mastery.** Teach deep enough that a learner can use the subject and re-derive the rest, with the intuition its discoverers had. Avoid the word "mastery" in new text (some old wording remains; Phase 6 removes it).
- **Gentle curve.** A reader with basic algebra and no programming must be able to start. Motivation ("why do I care?") comes before every topic.
- **Hard topics get several angles.** Short is not always better.
- **Case studies by background:** general, CS, ML, mechanical/civil, electrical, physics, maths (`ROLES` in `lessons/uses.js`). Real engineering uses, not only ML.
- **Never touch git** unless the owner asks in that session. `git rm`/`git mv`/`git add` count as git writes: use plain `rm`/`mv`.
- **One heavy run at a time.** Never overlap vitest runs, builds or the browser check.
- Plain language in replies. Make technical decisions without asking.

## State of the project (2026-10-18, end of Phase 6a)

- **Committed:** Phases 1–4 (Phase 4 went in with commit `535a3f01`).
- **Done but NOT committed:** Phase 5 and Phase 6a. Their files:
  - Lab (`src/labs/linear-algebra-lab/`). New: `lessons/svd.js`, `practice/svd.js`, `explore/svd.jsx`. Modified: `curriculum.js`, `curriculum.test.js`, `practice.test.js`, `index.test.jsx`, `explore.test.jsx`, `Explore.jsx`, `lab.css`, `practice/index.js`, `lessons/core.js`, `lessons/enrich.js`, `lessons/spaces.js`, `lessons/spectral.js`, `lessons/uses.js`.
  - Engine: `packages/openmat/src/engine.ts`, `packages/openmat/src/compat.ts`, `packages/openmat/src/__tests__/engine.test.ts`.
  - Docs: `docs/linear-algebra-lab-gentle-plan.md` and this file.
  - Any untracked `docs/notebooks/*` files belong to another session. Don't stage them.
- **Size:** 67 lessons in 13 modules over 4 stages (`STAGES` in `curriculum.js`).
- **Reworked in the gentle style (why, uses, angles):** all of Stages 1 and 2, and in Stage 3 every module except "Least squares and data". The `gentle curve` test in `curriculum.test.js` lists the reworked modules; add each module to it once it is done.
- **Last checks (2026-10-18):**
  - `npx vitest run src/labs/linear-algebra-lab packages/openmat`: 654 passed.
  - `npm run typecheck`: clean.
  - `npm run catalog:check`: current on 2026-10-17 (the 14 content problems that were already there). No lessons were added since.
  - Browser check: span and rank in light and dark mode, no page errors.
  - The production build was last run at the Phase 3 commit.

## Next: Phase 6b, "Best fit"

Read the Phase 6 entry in the plan. In short:
1. Rename the module "Least squares and data" to "Best fit". Module names are not progress keys, but update `STAGES`, `BY_MODULE` in `Explore.jsx` and every lesson's `module`.
2. A new opening lesson: find your position from noisy GPS satellites (more equations than unknowns, so no exact answer: find the closest).
3. Make least squares, QR, Gram–Schmidt and orthogonal matrices gentler; add why stories, case studies and angles; add the module to the `gentle curve` test.
4. Move `laml-regression-validation` and `laml-ridge-scaling` to "Math for machine learning".
5. Lab suite, browser check, then update the plan and this file.

Then 6c (Stage 4 tracks and the "mastery" wording) and 6d (guessable families, Derive it).

## How the lab is built

- **A lesson** is an object in a `lessons/*.js` file. The schema and its checks are in `curriculum.test.js`.
  - **New lessons:** go in a base list passed to `assemble()` in `curriculum.js`, or in an `additions` list with `after: '<id>'`.
  - **Order:** lessons are sorted by module in `STAGES` order. A lesson whose module is in no stage throws an error.
  - **Extra fields for older lessons:** `ENRICH` in `lessons/enrich.js` adds notation, quiz and proof. `USES` and `ANGLES` in `lessons/uses.js` add case studies and extra angles. All three are merged by id.
- **Ids never change**: they are progress keys. A rewrite keeps the id.
- **Demos:** `demo.draw` holds the plotting code. It runs after `demo.code` and is shown collapsed. Every demo must plot, with a title.
- **Challenges:** the test runs the reference solution, which must pass, and the starter, which must fail, and also checks every `cases` variant.
- **Practice families:** in `practice/*.js` and merged in `practice/index.js`. Each lesson needs at least 6 families. Each family must:
  - pass with its reference solution on 6 seeds;
  - fail with its starter;
  - fail with an answer hard-coded from one draw (unless listed in `GUESSABLE`);
  - name every output in its prompt.

  Expected answers come from running the reference solution, so generators only produce inputs. `practice/eigen.js` is the newest example.
- **Engine quirks (OpenMAT) to avoid in lesson code:**
  - Name a right-hand side before solving: write `b = [12; 0]; x = G \ b`, not an inline vector.
  - Write `[A b]` with a space, not a comma.
  - `[cos(t); sin(t)]` of row vectors gives a 1 × N row. Fill matrix rows by index instead.
  - `u*u'` of flat vectors gives a dot product. Use `reshape` for outer products.
  - Don't put a transpose quote and a string on the same line. Use `transpose(V)`.
  - Avoid complex numbers.
  - Fixed in the engine on 2026-10-18: `bar(x, y)` now draws y; `find(x, n)` returns the first n matches; `norm(A, 'fro')`, `norm(A, 1)` and `norm(A, Inf)` work for matrices. Older lessons still use the workarounds, which are fine.
  - Also fixed on 2026-10-18: the "MATLAB table/file I/O" and other compatibility warnings no longer fire on words inside strings or comments, such as `disp('a table')`.
  - `reshape` fills row by row, not column by column as MATLAB does: `reshape([1 2 3 4], 2, 2)` gives `[1 2; 3 4]` here and `[1 3; 2 4]` in MATLAB. Only use it to turn a vector into one row or one column until this is fixed.
  - Column slices such as `A(:,1:1)` and `reshape(v, 3, 1)` stored in a variable become flat vectors. An outer product works inline (`reshape(u, m, 1)*reshape(v, 1, n)`) or through the SVD form `U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k))`, which also works for k = 1.
  - Don't name a variable after a built-in function (for example `floor`).
- **Maths in text** is KaTeX between `$…$`. Inside JS single-quoted strings, backslashes must be doubled (`'$\\lambda$'`), or use the `t` = `String.raw` template. A test renders every snippet.

## Verification

- Single test files are about 5–15 s: `npx vitest run src/labs/linear-algebra-lab/curriculum.test.js` (likewise `explore.test.jsx`, `index.test.jsx`). New practice families: `npx vitest run src/labs/linear-algebra-lab/practice.test.js -t "<lesson id fragment>"`.
- Full suite, about 85 s: `npx vitest run src/labs/linear-algebra-lab packages/openmat`. Run it from the repo root: from the lab folder the vite config fails to load.
- **Browser check:**
  1. Start `npx vite --port 5199 --strictPort` in the background.
  2. Run `node <scratchpad>/lab.mjs <outdir> <width> <dark 0|1> '<steps json>'` with `PW_EXE` set to `chromium_headless_shell-1248/*/chrome-headless-shell.exe` under `~/AppData/Local/ms-playwright`. A step looks like `{"module":"Tensors","lesson":"Stress","tab":"explore|learn|practice","run":true,"click":"<button>","shot":"name","selector":".css"}`.
     - Give `module` only when the module isn't already open: clicking it again closes it.
     - At phone width the sidebar is hidden, so the script can't reach a lesson there.
  3. Stop the server afterwards. TaskStop leaves the node process listening, so also kill the process on port 5199.
  4. The script lives in the old session's scratchpad. If it is gone, rewrite it: Playwright opens `#/lab/linear-algebra-lab`, maximises, clicks the sidebar lesson buttons (`.la-module li button`) and the tabs, and takes the screenshots.
- **Shell gotcha:** Bash heredocs here halve backslashes. Write edit scripts to the scratchpad with the Write tool and run the file, or use Edit.
