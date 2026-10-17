# Linear Algebra Lab

Implemented on 2026-10-16. Open **Linear Algebra Lab** from the lab catalog, or use **Open linear algebra series** in OpenMAT. Its discovered route is `#/lab/linear-algebra-lab`.

## Audience and teaching sequence

The entry requirement is basic arithmetic. No programming or MATLAB experience is assumed. Assignment, comments, arrays, indexing, plotting and matrix operators are taught at first use. The opening uses a delivery-price model before introducing feature vectors and datasets.

| Module | What the learner builds or explains |
|---|---|
| First steps | Calculations, labelled plots, ordered measurements, matrix indexing and the distinction between matrix and entrywise operations |
| Vector geometry | Weighted combinations, dot products, distance, cosine similarity and orthogonal projection |
| Matrices as maps | Coordinate transformations, composition order, linear solves and determinant/area interpretation |
| Systems and subspaces | Elimination, rank, independence, free variables, nullspaces and pivoted LU |
| Spaces and bases | Polynomials as vectors, subspaces and planes in ℝ³, basis and dimension, change of basis, the four fundamental subspaces and rank–nullity |
| Least squares and data | Orthogonality, QR, Gram–Schmidt, orthogonal matrices, residuals, regression, held-out evaluation, conditioning and ridge |
| Spectral thinking | Eigenvectors, quadratic forms, covariance, PCA, singular values and low-rank reconstruction |
| Spectral theory | Diagonalization and powers, complex eigenvalues as rotation, positive-definite matrices and Cholesky, the spectral theorem and why every matrix has an SVD |
| Math for machine learning | Vectorized gradients, gradient descent, stable logistic loss and neural-network chain-rule calculations |
| Dynamic programming | State distributions, fixed-policy evaluation, finite-horizon backward induction and Bellman optimality updates |
| Mastery studio | Recommendation limitations, a PCA/ridge pipeline, policy iteration, and a combined prediction/control audit |

The authored sequence lives in [curriculum.js](../src/labs/linear-algebra-lab/curriculum.js), assembled from ordinary data modules in [the lesson folder](../src/labs/linear-algebra-lab/lessons). Lessons added later name the lesson they follow (`after:`), so new modules slot into the sequence without renumbering. [enrich.js](../src/labs/linear-algebra-lab/lessons/enrich.js) adds notation, quick checks and proofs to the original lessons. Lab-internal activities are not course-loader lessons; the generated inventory counts the discovered lab rather than treating these activities as standalone course pages.

## Learning workflow

Each lesson includes concrete-first teaching, a reusable procedure, a prediction, an editable worked example with a labelled plot, and explanations of the code. Practice supplies fixed inputs separately from the learner's program, progressive hints, a reference solution and an independent transfer task. Every lesson also states its key results in notation (KaTeX), ends the Learn tab with a quick check, and many have a **Reason & prove** tab: a proof built one step at a time, where each wrong move explains itself. The worked-example plots are specific to each lesson; each lesson opens the playground experiment that fits it.

Quick-check answers feed **spaced review** ([review.js](../src/labs/linear-algebra-lab/review.js)): Leitner boxes with intervals of 1, 3, 7, 21 and 60 days, and a missed question returns after ten minutes. The **mastery map** shows four marks per lesson: ran the example, passed the challenge, built the proof (where there is one), and retained in review (every question in box 3 or above).

The executor imports the same OpenMAT engine as the existing studio. Results cross from the worker to the page by structured clone, so functions in the workspace (such as `f = @(x) x.^2`) are replaced with null first ([execution.js](../src/labs/linear-algebra-lab/execution.js), `cloneable`). Runs use fresh module workers with a time limit and a Stop control. Neither previous lessons nor previous runs contribute variables. Challenge checks inspect actual numeric workspace values and their shapes, using tolerances. Transfer fixtures rerun the same submitted program against changed data where supplied. Editable datasets and output grading are learning aids, not tamper-proof assessments.

Drafts, last selected lesson, edited examples, reference views, successful checks, example runs, completed proofs and review schedules are saved under `upskillos.linear-algebra-lab.v1` in local storage. A storage error is visible to the learner. Reference-supported practice is recorded separately from a pass without opening the reference. An edited draft is labelled as changed since its previous pass. Transfer tasks and the written mastery audit are self assessed; passing automatic checks does not establish mastery.

## Engine conventions

OpenMAT implements a MATLAB-style subset. It currently stores row and column vectors in the same flat form; vector `size` and workspace displays cannot demonstrate MATLAB's orientation distinction. Genuine multirow, multicolumn matrices preserve their shape. The teaching and syntax guide explain this limitation.

Known engine limits that lessons work around: stacking two flat rows (`[cos(t); sin(t)]`) gives one long row, so lessons fill matrix rows by index; the outer product `u*u'` of flat vectors returns a dot product (use `reshape(u,n,1)*reshape(v,1,m)`); `[A, b]` with a comma mis-concatenates, while side-by-side flat columns such as `[u w v]` work; complex results are unreliable, so complex eigenvalues are taught through the trace and determinant; a transpose quote and a string literal on the same line confuse the parser; and a solve written with the vector inline (`G \ [12; 0]`) is misread, so lessons name the right-hand side first.

Engine fixes made for this lab (2026-10-17, with tests in the package): `eig(A)` and `svd(A)` with one output return values, as in MATLAB (`[V,D] = eig(A)` and `[U,S,V] = svd(A)` still return factors); `chol` returns the upper-triangular factor and rejects matrices that are not positive definite; `rank` and `cond` accept a single row or column; `diag` of a 1 × n or n × 1 matrix builds a diagonal matrix (previously `diag([1 u])` returned `[1]`); `[value, position] = max(v)` and `min(v)` work, also column by column for matrices; and a caller's output count no longer leaks into the statements inside a user-defined function. Figures now carry `xlabel`, `ylabel` and `legend` fields, and tag their axis-label text elements with a `role`.

Examples use explicit column means for centering and explicit sums for Frobenius reconstruction error. Lessons teach numerically stable logistic loss and use train-only preprocessing. Markov examples name their row/column convention; control examples specify terminal values and distinguish fixed-policy evaluation from action maximization. A small residual verifies an equation, not the quality or fairness of a real deployment.

## Verification and review

The executable curriculum tests run each worked example, require a figure, grade the reference, reject the runnable starter, and rerun available transfer fixtures. Component tests cover rendered teaching, plotting integration, numerical feedback, saved drafts/progress, lesson switching, hints, corrupt storage and interactive visuals. Runner tests cover cleanup, cancellation, timeout and worker errors. See [the tests](../src/labs/linear-algebra-lab/curriculum.test.js).

Further tests cover the playground (every experiment renders, and its "same experiment in OpenMAT" code runs in the real engine), the review scheduler, and the new content: every formula in notation, quiz and proof text must render in KaTeX, and every quiz and proof step must have a valid answer. Run `npx vitest run src/labs/linear-algebra-lab` (405 tests on 2026-10-17) and `npx vitest run` in `packages/openmat` (64 tests). Learner pacing sessions and an independent human review remain open; the word “mastery” names the final practice stage, not a certification.

## Problem sets

Each lesson except the SVD compression lesson has a **Problem set** tab with six problem families, warm-up to transfer ([ProblemSet.jsx](../src/labs/linear-algebra-lab/ProblemSet.jsx), content in [the practice folder](../src/labs/linear-algebra-lab/practice)). Every family generates fresh inputs from a stored seed. Answers are not typed in: [execution.js](../src/labs/linear-algebra-lab/execution.js) runs the authored reference on the same inputs in a separate engine, and the learner's same program must also pass two unseen draws. Passes are recorded per family with the draw and whether the reference was opened.

[practice.test.js](../src/labs/linear-algebra-lab/practice.test.js) runs every family on six draws: the reference passes its own and the unseen draws, the starter fails, and hard-coding one draw's answers fails. Fifteen families are listed there as guessable (their answer is the same, or repeats, across draws: mostly rank and nullity counts and zero checks); fixing their generators is open work, and the test fails if a fixed family stays listed.

## Interface and design rules (2026-10-16 redesign)

- **Code is highlighted everywhere.** Editing uses Monaco with the `openmat` grammar and the lab's own `la-light` / `la-dark` themes ([code.jsx](../src/labs/linear-algebra-lab/code.jsx)). Read-only code (given data, reference solutions, line notes, the syntax guide, playground code) uses Prism's MATLAB grammar with the same token colours. Ctrl/Cmd + Enter runs the editor.
- **Colour has meaning.** Each module has its own hue for wayfinding; the current module's hue is the page accent. In every picture: red = first column / e₁, green = second column / e₂, gold = the input vector, violet = the result, blue = a direction, pink = a residual or error. New visuals must keep these meanings.
- **Workbench layout.** On wide screens, the editor and its output sit side by side. Workspace variables are drawn as bracketed matrices with their shapes.
- **Plots.** [Plot.jsx](../src/labs/linear-algebra-lab/Plot.jsx) draws OpenMAT figures as SVG. It lays out margins from the real tick and label text (so axis labels are never clipped), shows a legend, reads out the nearest data point on hover, and saves an SVG. Figures with element types it does not draw fall back to the shared canvas renderer.
- **Playground.** [Explore.jsx](../src/labs/linear-algebra-lab/Explore.jsx) registers eleven experiments in [the explore folder](../src/labs/linear-algebra-lab/explore): combine vectors, dot product and projection, matrix as a map (warped grid, signed area, eigen-directions, repeated application), circle to ellipse (SVD), row operations, solution sets (particular solution plus nullspace), 3D span and volume (rotatable), least squares (draggable points, fit by hand), principal directions, gradient descent and Bellman updates. Vector tips are draggable and keyboard-movable.

## Road to mastery: status

The 2026-10-16 gap list is done: notation in every lesson; theory modules (Spaces and bases, Spectral theory, Gram–Schmidt and orthogonal matrices); proof practice (25 lessons); per-lesson visuals; 3D; and spaced review with a mastery map. 47 lessons in 11 modules.

Still open:

1. **Learner testing.** No one has worked through the series yet. Pacing, difficulty and the proofs' wrong options need real learners.
2. **More proofs.** 22 lessons have no proof, mostly the applied machine-learning and dynamic-programming ones, where a short derivation (for example the Bellman contraction) would fit.
3. **Engine limits** listed above. Fixing flat vectors and complex numbers in OpenMAT would let lessons write `u*u'` and `eig` of a rotation directly.
4. **Problem sets:** fifteen guessable families need generators that vary structure, the SVD compression lesson has no problem set, and problem-set completion is not yet a mark on the mastery map.
5. **3D output from code.** `plot3` produces a 3D request that the lab does not render yet; 3D is currently taught in the playground only.
