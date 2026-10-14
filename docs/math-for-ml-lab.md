# Math for ML Lab: plan and status

Route: `#/lab/math-for-ml`, discovered from `src/labs/math-for-ml/meta.js`. Read this file first when resuming, and update **Where we stopped** and the status board.

## The brief

Asked for on 2026-10-13: "the best place for someone with no math skills to learn machine learning maths and have fun doing so… we always show how we get to the big equation built up." Extended the same day: "exhaustive, but also approachable, each building on the other, no magic, simplifications just appearing from nowhere, steps skipped, and all intuitive… some algorithm maths… some computer science maths… paper walkthroughs… coding exercises built into each lesson… assume the learner is comfortable with Python."

The standard every lesson meets:

1. **Nothing used before it is built.** A lesson may only use symbols, facts and techniques from earlier lessons (its `builds` list), or build them on the spot.
2. **No magic.** Every result is derived, or demonstrated and then derived, in steps a reader with the earlier lessons can check. "It turns out" is not allowed. If a full proof is genuinely beyond the course, the lesson says so, says exactly what is being taken on trust, and shows numerical evidence.
3. **Intuition first, then the symbols, then the code.** A picture or a concrete number before the general formula.
4. **A coding exercise in every lesson.** The learner writes Python (they are comfortable with it): implement the formula, check it numerically, or use it. Checked automatically in the browser (Pyodide); reference solutions verified in the tests.
5. **Measured, not asserted.** Every number in a lesson comes from the engine or from a checked computation.

## How it is built

| Piece | Where | What it is |
|---|---|---|
| Python programs | `python/` | Plain Python 3, standard library only: the maths as loops |
| Engine | `engine/maths.js`, `engine/fall.js` | The programs in JavaScript, for figures and tests; parity-tested against Python |
| Lessons | `lessons/*.js` | Blocks (`../python-steps/Blocks.jsx`); the six opening-chapter lessons in `lessons/fall.js` keep their ids and block order (progress keys) |
| Exercises | `exercises/partN.js`, keyed by lesson id: `{ prompt, starter, solution, checks, hints }` | `lessons/index.js` places each one just before its lesson's closing note. Written with the `py` tag and `checks()` from `exercises/checks.js` (the `expect(got, want, what)` helper). Run in the browser by `../python-steps/Exercise.jsx` (Monaco + a Pyodide worker); `exercises.test.js` runs every solution (must pass) and starter (must fail) in Node's Pyodide via `../python-steps/exerciseRunner.js` |
| Cross-references | `[[#lesson-id]]` and `[[#part:part-id]]` in any lesson string | Resolved to the current number by `lessons/index.js`, so parts and lessons can be inserted anywhere. Never write a number by hand: `lessons.test.js` fails on "lesson 3.4" or "Part 2" in the source and on any id that doesn't exist |
| Figures | `figures/` | Interactive SVG figures on a shared `Graph` |
| Symbol decoder | `decoder.js`, `Decoder.jsx` | Every symbol and famous equations taken apart |
| Real Python tab | `PythonTab.jsx`, `programs.js`, `functions.js` | The shared python-steps tab |

Progress key: `upskillos.math-for-ml.v1` (unchanged since the opening chapter).

## The curriculum

Lesson ids are permanent; numbers are display only and change as parts are inserted. ✅ built (with its exercise, no-magic audit done) · ⬜ planned. Part ids keep their original names (`part1` symbols, `part2` calculus, `part3` linear algebra, `part4` probability, `part5` big equations, `part6` papers) whatever their position.

### Part 1 · Reading the symbols
✅ symbols-welcome, functions, subscripts, sigma, powers, number-e, logarithms, composition, greek, argmin
✅ `sets`, `logic`, `piecewise`, `inequalities` (in `lessons/foundations.js`; order set in `lessons/index.js`'s LAYOUT)

### Part 2 · Proof and counting (new)
✅ `proof`, `contradiction`, `induction`, `counting`, `combinations`, `binomial`, `pigeonhole` (part id `proof-counting`; `lessons/proof.js`, `python/proof.py`, `figures/proof.jsx`, `exercises/proof.js`)

### Part 3 · Change: calculus
✅ observe, measure, record, graph, change, rate, slope, instant, derivative, derivative-rules, exp-log-slopes, chain-rule, minimum, gradient-descent-1d, partial-derivatives, gradient, gradient-descent-2d, integral
✅ `limits-precise`, `product-quotient`, `inverse-derivative`, `second-derivative`, `fundamental-theorem` (antiderivatives), `integration-techniques`, `taylor` (`lessons/change.js`, in the calculus part; Taylor last so its error bound is proved with the fundamental theorem)
✅ `multivariable-chain`, `jacobian`, `hessian` (`lessons/manyvars.js`): placed after `matrix-gradients` in the linear-algebra part, because they need matrices
✅ `double-integrals`, `gaussian-integral` (`lessons/areas.js`): placed after `densities` in the probability part, just before `normal`, which they now justify

### Part 4 · Arrows and tables: linear algebra
✅ vectors, vector-arithmetic, norm, dot-product, matrices, transformations, matrix-multiplication, transpose, inverse, systems, least-squares, eigenvectors, matrix-gradients
✅ `cosine-law`: merged into `dot-product` (derived there with the law of cosines; no separate lesson)
✅ `span-basis`, `gaussian-elimination`, `rank`, `determinant-n`, `orthogonality`, `orthogonal-matrices`, `spectral`, `positive-definite`, `svd`, `matrix-norms-trace`, `low-rank`, `matrix-calculus`, `tensors` (`lessons/linalg2.js`, `lessons/linalg3.js`, `python/matrices.py`, `figures/matrices.jsx`, `exercises/matrices.js`; order in `lessons/index.js`)

### Part 5 · Chance and data: probability and statistics
✅ probability, distributions, expectation, variance, conditional, bayes, densities, normal, sampling, likelihood, mle, covariance, pca
✅ `axioms`, `independence`, `common-distributions`, `joint-marginal`, `sums-of-variables`, `law-large-numbers`, `clt`, `change-of-variables`, `multivariate-gaussian`, `map`, `estimation`, `hypothesis-tests`, `monte-carlo`, `jensen`, `information`, `markov-chains` (`lessons/prob2.js`, `lessons/prob3.js`, `python/chance.py`, `figures/chance.jsx`, `exercises/chance.js`). `covariance` moved earlier in the part (before `sums-of-variables`); `sampling` now follows `clt`.

### Part 6 · Optimisation (new)
✅ `convexity`, `gd-convergence`, `newton`, `sgd`, `momentum-math`, `lagrange`, `kkt`, `duality` (part id `optimisation`, placed after probability; `lessons/optimisation.js`, `python/optimise.py`, `figures/optimise.jsx`, `exercises/optimise.js`)

### Part 7 · Algorithms and computer-science maths (new)
✅ `big-o`, `loop-costs`, `recurrences`, `logs-in-algorithms`, `floating-point`, `stability`, `random-numbers`, `autodiff`, `dynamic-programming`, `graphs`, `hashing` (part id `algorithms`, after optimisation; `lessons/algorithms.js`, `python/algorithms.py`, `figures/algorithms.jsx`, `exercises/algorithms.js`)

### Part 8 · The big equations
✅ linear-regression, regression-gradient, regularisation, logistic-regression, softmax, entropy-kl, layers, backpropagation, optimisers, attention
✅ `bias-variance` the bias–variance decomposition, derived
✅ `naive-bayes` naive Bayes
✅ `k-means` k-means as minimising an objective
✅ `gmm-em` Gaussian mixtures and the EM algorithm
✅ `svm` support vector machines: margins, hinge loss, the dual and kernels
✅ `trees` decision trees: entropy, information gain, Gini
✅ `convolution` convolution as a sum, and as a matrix
✅ `initialisation` weight initialisation (Xavier, He): the variance argument
✅ `normalisation` batch and layer normalisation
✅ `dropout` dropout as an expectation
✅ `rnn-bptt` recurrent networks and backpropagation through time; vanishing gradients
✅ `transformer-block` a whole Transformer block: residuals, layer norm, positional encodings
✅ `contrastive` contrastive learning and InfoNCE
✅ `vae-elbo` the evidence lower bound and VAEs; the reparameterisation trick
✅ `gan` the GAN objective and its optimum
✅ `diffusion` diffusion models: the forward process, the noise-prediction loss
✅ `bellman-rl` MDPs and the Bellman equations
✅ `policy-gradient-derivation` the policy-gradient theorem: the log-derivative trick
✅ `ppo` PPO's clipped objective

### Part 9 · Learning theory (new)
✅ `generalisation` training, validation and test error; overfitting, formally
✅ `concentration` Markov, Chebyshev and Hoeffding inequalities
✅ `union-bound` the union bound and a first generalisation bound
✅ `pac-vc` PAC learning and VC dimension, gently
✅ `double-descent` modern surprises: double descent and implicit regularisation

### Part 10 · Reading papers
✅ reading-papers, decode-practice
✅ Paper walkthroughs, in the order the papers first appeared: `paper-dropout`, `paper-word2vec` (with InfoNCE), `paper-vae`, `paper-adam`, `paper-batchnorm`, `paper-resnet`, `paper-transformer`, `paper-ppo`, `paper-ddpm`, `paper-lora` (`lessons/papers.js`, `lessons/papers2.js`, `python/papers.py`, `figures/papers.jsx`, `exercises/papers.js`; their shared example data are in `engine/maths.js`). Each reads the paper's equations in its own notation, checked against the paper's text, and proves or tests what the paper states without proof. Findings the lessons teach: dropout's $p$ is the keep probability (PyTorch's is the drop probability); the CPC appendix's MI bound has an $\approx$ step; Adam's stated step bound $\alpha(1-\beta_1)/\sqrt{1-\beta_2}$ is exceeded by steadily growing gradients (limit about $7.27\alpha$), and AdaMax's $|\Delta| \le \alpha$ by up to 0.9%; PPO's eqs. (10)–(11) print the last exponent as $T - t + 1$ for $T - t - 1$; the original ResNet paper does not attribute degradation to vanishing gradients.

## Status board

| Work | Status |
|---|---|
| Exercise infrastructure (block, browser runner, Node verification) | ✅ |
| No-magic audit of the 66 built lessons | ✅ (four results still taken on trust, listed below) |
| Exercises for the 66 built lessons | ✅ |
| Part 1 additions | ✅ |
| Part 2 Proof and counting | ✅ |
| Part 3 additions | ✅ |
| Part 4 additions | ✅ |
| Part 5 additions | ✅ |
| Part 6 Optimisation | ✅ |
| Part 7 Algorithms and CS maths | ✅ |
| Part 8 additions | ✅ |
| Part 9 Learning theory | ✅ (figures browser-checked 2026-10-14) |
| Part 10 Paper walkthroughs | ✅ (figures browser-checked 2026-10-14) |

## Checks

| Command | What it checks |
|---|---|
| `npx vitest run src/labs/math-for-ml --exclude "**/*.desktop.test.js"` | Parity, lessons (answers, notes, functions), statement coverage, rendering, exercises (solutions pass, starters fail), bundle |
| `MATH_PYTHON=python3 npx vitest run src/labs/math-for-ml/stepper.desktop.test.js` | The Python-tab programs in the real stepper |
| `python3 src/labs/math-for-ml/tools/make_parity.py` | Regenerate parity data after changing a program |

## Taken on trust, to link when the lesson exists

Each is stated in its lesson as taken on trust, with numerical evidence. When the named lesson is built, replace the wording with a `[[#id]]` link.

| Where | Claim | Lesson that will prove it |
|---|---|---|
| `spectral` | real eigenvalues and a full eigenvector basis always exist (perpendicularity is proved) | none planned; Jacobi always converging is the evidence |
| `span-basis` | every basis of ℝⁿ has n vectors | none planned |
| `rank` | row rank = column rank | none planned; checked on random matrices |
| `determinant-n` | det Aᵀ = det A | none planned |
| `spectral` | each Jacobi rotation removes 2S²_pq of off-diagonal mass | none planned |
| `positive-definite` | Cholesky always succeeds on a positive definite matrix | none planned |
| `low-rank` | Eckart–Young (no rank-k matrix beats the truncated SVD) | none planned; the exercise tests 2000 random rivals |
| `kkt`, `duality` | KKT conditions are necessary in general; strong duality under Slater's condition | none planned |
| `clt` | moment generating functions determine distributions (uniqueness, and limits) | none planned |
| `common-distributions` etc. | Shannon's source coding theorem; the Beta integral (posterior mean, checked numerically in an exercise) | none planned |
| `hessian` | mixed partials are equal (Clairaut) | none planned; numerical evidence in the lesson |
| `double-integrals` | iterated integrals agree in either order (Fubini) | none planned; numerical evidence in the lesson |
| `contrastive` | log N − InfoNCE is a lower bound on the views' mutual information | none planned; `paper-word2vec` shows the CPC paper's own argument uses an approximation and cites the rigorous proof (Poole et al., 2019) |
| `concentration` (none) | — | Hoeffding is proved in full |
| `pac-vc` | linear classifiers in ℝᵏ have VC dimension k + 1; the symmetrisation step of the VC bound | none planned |
| `double-descent` | a random square matrix's smallest singular value is near 0 | none planned; the figure's ‖w‖ shows the effect |

Proved since: the e^x series (`taylor`), √(2π) (`gaussian-integral`), the normal's σ scaling and variance (`integration-techniques`), the noise-prediction loss as a reweighted bound (`paper-ddpm`; `diffusion` now links to it).

## Where we stopped

2026-10-13: first build complete (66 lessons, 54 figures, decoder, Python tab), all checks passing.

2026-10-13 (session 2): exercise infrastructure built and verified in the browser (Monaco, Pyodide worker, about 1.5 s per check); all 66 lessons have an exercise (198 Pyodide checks: solutions pass, starters fail); cross-references converted to `[[#id]]` placeholders with automatic numbering; the no-magic audit's 21 fixes made (derivations added for the e^x series, power/constant/sum rules, e^x and ln slopes, the chain rule, the general power rule, the gradient pointing uphill, the fundamental theorem, the geometric dot product, matrix multiplication, (AB)ᵀ, the 2×2 inverse and determinant-as-area, least squares' perpendicular miss, the 2/λ learning-rate limit, the normal's σ factor, variances adding, PCA's vᵀΣv and its maximum, MAP = ridge, the softmax gradient, KL ≥ 0, Adam's bias correction, attention's √d). Then Part 1's four additions and Part 2 Proof and counting (7 lessons, new part) built, with figures, exercises, parity and decoder rows; browser-checked. 77 lessons, 729 tests. Then Part 3's 12 calculus additions (placed across three parts, see above); Graph gained `jumps`, `yaxis` and `background`. 89 lessons, 838 tests. Then Part 4's 13 linear-algebra additions (Graph now clips segments to the plot area). 102 lessons, 958 tests. Then Part 5's 16 probability additions (Graph clips curves and segments to the plot). 118 lessons, 1105 tests. Then Part 6 Optimisation (8 lessons, new part). 126 lessons, 1180 tests. Then Part 7 Algorithms (11 lessons, new part); Graph y-ticks now depend on the plot's height. 137 lessons, 1282 tests. Then Part 8's 19 ML additions inside the big-equations part (`part5`), with `learners.py` and `deep.py`, two new Python-tab programs, decoder rows and exercises (`exercises/ml.js`). Per-lesson drawing moved out of `render.test.jsx` into `lessons-1/2/3.test.jsx` (shared `drawLessons.jsx`): in one worker the 156 lessons ran past the 4 GB heap. 156 lessons, 1458 tests. Then Part 9 Learning theory (new part `theory`, after the big equations; 5 lessons: `generalisation`, `concentration`, `union-bound`, `pac-vc`, `double-descent`) with `python/theory.py`, engine mirror, parity, figures (`figures/theory.jsx`), exercises (`exercises/theory.js`), decoder rows (group 'Learning theory') and a Python-tab program; `bias-variance` now links `double-descent`. 161 lessons, 1506 tests, stepper 3/3, typecheck clean.

2026-10-14: Part 9's five figures browser-checked (the union-bound labels moved off the default point). Part 10 built: ten paper walkthroughs with `python/papers.py` (45 functions), engine mirror and parity, ten figures, ten exercises, 22 decoder symbols (group 'Papers') and 11 equations, and a Python-tab program. Papers were read from their arXiv/JMLR text before writing. All ten figures browser-checked (ResNet and LoRA no longer clamp off-scale points into fake rows; the DDPM axis no longer clips). 171 lessons.

**The curriculum is complete.** Possible later work, none of it planned: more walkthroughs (for example GPT-2/3, CLIP, RLHF, Chinchilla scaling laws), and proofs for the results still listed as taken on trust.
