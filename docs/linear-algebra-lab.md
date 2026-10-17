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
| Least squares and data | Orthogonality, QR, residuals, regression, held-out evaluation, conditioning and ridge |
| Spectral thinking | Eigenvectors, quadratic forms, covariance, PCA, singular values and low-rank reconstruction |
| Math for machine learning | Vectorized gradients, gradient descent, stable logistic loss and neural-network chain-rule calculations |
| Dynamic programming | State distributions, fixed-policy evaluation, finite-horizon backward induction and Bellman optimality updates |
| Mastery studio | Recommendation limitations, a PCA/ridge pipeline, policy iteration, and a combined prediction/control audit |

The authored sequence lives in [curriculum.js](../src/labs/linear-algebra-lab/curriculum.js), assembled from ordinary data modules in [the lesson folder](../src/labs/linear-algebra-lab/lessons). Lab-internal activities are not course-loader lessons; the generated inventory counts the discovered lab rather than treating these activities as standalone course pages.

## Learning workflow

Each lesson includes concrete-first teaching, a reusable procedure, a prediction, an editable worked example with a labelled plot, and explanations of the code. Practice supplies fixed inputs separately from the learner's program, progressive hints, a reference solution and an independent transfer task. The visual playground includes vector scaling, matrix maps, projection, learning-rate experiments and synchronous Bellman updates. The worked-example plots are specific to each lesson; the playgrounds are shared conceptual experiments.

The executor imports the same OpenMAT engine as the existing studio. Runs use fresh module workers with a time limit and a Stop control. Neither previous lessons nor previous runs contribute variables. Challenge checks inspect actual numeric workspace values and their shapes, using tolerances. Transfer fixtures rerun the same submitted program against changed data where supplied. Editable datasets and output grading are learning aids, not tamper-proof assessments.

Drafts, last selected lesson, edited examples, reference views and successful checks are saved under `upskillos.linear-algebra-lab.v1` in local storage. A storage error is visible to the learner. Reference-supported practice is recorded separately from a pass without opening the reference. An edited draft is labelled as changed since its previous pass. Transfer tasks and the written mastery audit are self assessed; passing automatic checks does not establish mastery.

## Engine conventions

OpenMAT implements a MATLAB-style subset. It currently stores row and column vectors in the same flat form; vector `size` and workspace displays cannot demonstrate MATLAB's orientation distinction. Genuine multirow, multicolumn matrices preserve their shape. The teaching and syntax guide explain this limitation.

Examples use explicit column means for centering and explicit sums for Frobenius reconstruction error. Lessons teach numerically stable logistic loss and use train-only preprocessing. Markov examples name their row/column convention; control examples specify terminal values and distinguish fixed-policy evaluation from action maximization. A small residual verifies an equation, not the quality or fairness of a real deployment.

## Verification and review

The executable curriculum tests run each worked example, require a figure, grade the reference, reject the runnable starter, and rerun available transfer fixtures. Component tests cover rendered teaching, plotting integration, numerical feedback, saved drafts/progress, lesson switching, hints, corrupt storage and interactive visuals. Runner tests cover cleanup, cancellation, timeout and worker errors. See [the tests](../src/labs/linear-algebra-lab/curriculum.test.js).

Recorded commands and remaining browser/build checks are updated below as verification completes. Learner pacing sessions and an independent human review remain open; the word “mastery” names the final practice stage, not a certification.

## Interface and design rules (2026-10-16 redesign)

- **Code is highlighted everywhere.** Editing uses Monaco with the `openmat` grammar and the lab's own `la-light` / `la-dark` themes ([code.jsx](../src/labs/linear-algebra-lab/code.jsx)). Read-only code (given data, reference solutions, line notes, the syntax guide, playground code) uses Prism's MATLAB grammar with the same token colours. Ctrl/Cmd + Enter runs the editor.
- **Colour has meaning.** Each module has its own hue for wayfinding; the current module's hue is the page accent. In every picture: red = first column / e₁, green = second column / e₂, gold = the input vector, violet = the result, blue = a direction, pink = a residual or error. New visuals must keep these meanings.
- **Workbench layout.** On wide screens, the editor and its output sit side by side. Workspace variables are drawn as bracketed matrices with their shapes.
- **Playground.** [Explore.jsx](../src/labs/linear-algebra-lab/Explore.jsx) has five experiments: combine vectors, dot product and projection, matrix as a map (warped grid, signed-area parallelogram, eigen-directions, presets), gradient descent and Bellman updates. Vector tips are draggable and keyboard-movable. Each lesson opens the most relevant experiment (`experimentFor`); the learner can switch.

## Road to mastery: what is still missing

The 36 activities cover an applied path. Before the lab honestly teaches “zero to mastery”, it needs:

1. **Mathematical notation in lessons.** No lesson uses LaTeX yet (`MarkdownProse` already renders `$…$`). Every definition and result should appear as notation as well as code.
2. **Theory modules:** vector spaces and subspaces in the abstract, basis and dimension, change of basis, the four fundamental subspaces and the rank–nullity theorem, Gram–Schmidt, orthogonal matrices, diagonalization and similarity, complex eigenvalues, positive-definite matrices, and the spectral theorem and SVD stated and proved.
3. **Proof practice:** short “why is this true” items with checked reasoning steps, not only numeric checks.
4. **Per-lesson visuals:** the playground is shared. Lessons on elimination, the nullspace, least squares, PCA and the SVD each deserve a dedicated picture (row operations animated, the solution set as a line or plane, the projection onto a column space, ellipse axes).
5. **3D:** span in ℝ³, planes as solution sets and 3×3 maps. OpenMAT's 3D grapher exists and is not yet used here.
6. **Spaced review:** a retrieval quiz that resurfaces earlier lessons, and a mastery map of which skills are proven.
