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

## State of the project (2026-10-18, Phase 7a)

- **Committed:** Phases 1–6d (the tree was clean at the start of the Phase 7a session).
- **Done but NOT committed:** Phase 7a. Files: `src/labs/linear-algebra-lab/lessons/core.js`, `lessons/applications.js`, `lessons/uses.js`, `curriculum.test.js`, `docs/linear-algebra-lab-gentle-plan.md` and this file.
  - Any untracked `docs/notebooks/*` files belong to another session. Don't stage them.
- **Size:** 68 lessons in 12 modules: three stages of core modules, then two optional tracks (`STAGES` in `curriculum.js`).
- **Optional tracks (6c):** the last entry of `STAGES` is "Optional tracks" (`TRACK_STAGE`), with "Machine learning" (6 lessons) and "Decisions" (5 lessons). Each lesson there gets `track: <module>`; the sidebar says "any order" and the lesson header shows "Optional track". A test keeps "mastery" out of the lessons.
- **Clean-ups (6d):** a single `*` in prose always shows as multiplication (`stars.js`; italics are `_word_`); no practice family can be passed with a hard-coded answer (`GUESSABLE` is empty); `derive` (Derive it) steppers in projection, least squares and eigenvalues.
- **Gentle style (7a):** every lesson in the lab now has a `why` story, at least 4 case studies and extra angles. The 11 track lessons got theirs in 7a: `why` in the lesson objects, `USES` and `ANGLES` entries at the end of `lessons/uses.js`. The gentle-curve test now checks all lessons, not a list of modules.
- **Last checks (2026-10-18, 7a):**
  - `npm run build`: passes (2 m 25 s), run at the start of 7a on the committed Phase 6 code.
  - `npx vitest run src/labs/linear-algebra-lab/curriculum.test.js`: 144 passed (covers the schema, the new story rule and KaTeX rendering of every story, case study and angle).
  - Not run in 7a: the full lab suite and a browser check. 7a only added text fields that existing components already display; a browser look at one track lesson is a cheap first step next session.

## Next: Phase 7 (the owner picks the order)

Done: **7a**, the two tracks in the gentle style. Remaining candidates, roughly in value order:

1. **More "Derive it" steppers** for results that are stated before they are shown, for example the determinant as an area, the inverse of a 2 × 2, the Gram–Schmidt step and the power-iteration convergence ratio. Good track candidates too: the stable log-loss identity and the policy-evaluation geometric series (both already sketched as angles in 7a).
2. **The missing tracks:** Graphics and 3D (homogeneous coordinates, a camera) and Engineering (spring networks, finite elements). New lessons need 6 problem families each, plus a why story and 4 case studies (the gentle test now requires them for every lesson).
3. **OpenMAT `reshape` order** (row-major here, column-major in MATLAB). It needs a site-wide check before changing.

## How the lab is built

- **A lesson** is an object in a `lessons/*.js` file. The schema and its checks are in `curriculum.test.js`.
  - **New lessons:** go in a base list passed to `assemble()` in `curriculum.js`, or in an `additions` list with `after: '<id>'`.
  - **Order:** lessons are sorted by module in `STAGES` order. A lesson whose module is in no stage throws an error.
  - **Extra fields for older lessons:** `ENRICH` in `lessons/enrich.js` adds notation, quiz and proof. `USES` and `ANGLES` in `lessons/uses.js` add case studies and extra angles. All three are merged by id.
- **Ids never change**: they are progress keys. A rewrite keeps the id.
- **Derive it:** `derive: { claim, given, steps: [{ ask, options, answer, why }], conclusion }` on a lesson, the same shape as `proof`. It shows in the Learn tab after the reading. At least 3 steps; the schema test checks it like a proof.
- **Stars in prose:** a single `*` is always shown as multiplication. Write italics as `_word_`.
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
  - Fixed in Phase 6b: backslash after an indexed matrix (`D(1:2,:)\r(1:2)`); `[Q, R] = qr(X, 0)` now returns the thin factors; `norm(A)` works for non-square matrices; `rank` and `cond` use accurate singular values (one-sided Jacobi), so a badly conditioned matrix no longer reports `cond` = 1 and a singular one reports `Inf`. The `svd` factors themselves are unchanged.
  - Mixed `*` and `\` on one line, such as `2*inv(M)\b`, are not grouped as MATLAB groups them. Use brackets or separate lines.
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
  4. The code editor fills in its lines a moment after a tab opens, so a screenshot taken straight away can show only line 1. The copy of the script in the 2026-10-18 Phase 6b scratchpad has a `"text": "<selector>"` step that waits and then prints the element's text. Use `.la-editor .view-lines` to read the editor.
  5. The script lives in the old session's scratchpad. If it is gone, rewrite it: Playwright opens `#/lab/linear-algebra-lab`, maximises, clicks the sidebar lesson buttons (`.la-module li button`) and the tabs, and takes the screenshots.
- **Shell gotcha:** Bash heredocs here halve backslashes. Write edit scripts to the scratchpad with the Write tool and run the file, or use Edit.
