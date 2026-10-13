# Math for ML Lab: plan and status

Route: `#/lab/math-for-ml`, discovered from `src/labs/math-for-ml/meta.js`. Read this file first when resuming, and update **Where we stopped**.

The mathematics of machine learning for someone who knows basic algebra and finds ML papers' symbols foreign. Every symbol is introduced when it is needed and built from earlier ones, and every big equation (mean squared error, cross-entropy, softmax, backpropagation, Adam, attention) is assembled piece by piece from Parts 1 to 4. Asked for on 2026-10-13: "the best place for someone with no math skills to learn machine learning maths and have fun doing so… we always show how we get to the big equation built up".

It follows QMaze, CartPole and Neural Net Lab: lessons built from blocks (`../python-steps/Blocks.jsx`), interactive figures on the real numbers, every line of every Python program explained, an engine that reproduces the Python, and a Real Python tab. It grew from the original opening chapter (a falling ball, average velocity), whose six lessons open Part 2 unchanged.

## How it is built

| Piece | Where | What it is |
|---|---|---|
| Python programs | `python/` | Plain Python 3, standard library only, maths as loops: `symbols.py` (Σ, Π, e, log, σ, argmin), `calculus.py` (rates, derivatives, gradient descent, Riemann sums), `linalg.py` (vectors and matrices as lists), `stats.py` (probability, Bayes, normal, likelihood, covariance, PCA), `models.py` (regression, cross-entropy, softmax, KL, layers, backprop, Adam, attention) |
| Engine | `engine/maths.js` (and `engine/fall.js`, the opening chapter's falling ball) | The Python programs in JavaScript, for the figures and the tests |
| Parity | `tools/make_parity.py` → `engine/parity.json`, `engine/parity.test.js` | Compared to 1e-12 (1e-9 for numerical derivatives): Python's `sum()` uses compensated summation and its `exp`/`log` can differ in the last bit |
| Lessons | `lessons/part1.js` … `part6.js`, `lessons/fall.js` | 66 lessons; the six in `fall.js` keep their original ids and block order (progress keys) |
| Figures | `figures/` | 54 interactive figures on a shared SVG `Graph` (`figures/ui.jsx`) with draggable points |
| Symbol decoder | `decoder.js`, `Decoder.jsx`, `figures/part6.jsx` | Every symbol (how to say it, meaning, code, lesson) and 13 famous equations broken into clickable pieces |
| Real Python tab | `PythonTab.jsx`, `programs.js`, `functions.js`, `lineNotes.js` | The shared python-steps tab |

Progress is stored under the opening chapter's key, `upskillos.math-for-ml.v1`, in the same format, so earlier progress carries over.

## Lessons

1. **Reading the symbols** (10): variables and $\hat y = wx + b$; functions and $f_\theta(x)$; subscripts and $x^{(i)}$; Σ and Π; powers and roots; $e$; logarithms; composition and the sigmoid; the Greek conventions; argmin.
2. **Change: calculus** (18): the falling ball (6 original lessons); slope; limits; the derivative from its definition; the rules; $e^x$ and $\ln x$; the chain rule ($\sigma' = \sigma(1-\sigma)$); minima; gradient descent; partial derivatives; the gradient; gradient descent in 2D; the integral.
3. **Arrows and tables: linear algebra** (13): vectors; linear combinations; norms; the dot product; matrices as layers; transformations; matrix multiplication; transpose; inverse and determinant; systems; least squares and the normal equations; eigenvectors; gradients of vector expressions.
4. **Chance and data** (13): probability; distributions; expectation; variance; conditional probability; Bayes; densities; the normal distribution built in four steps; sampling and the standard error; likelihood; maximum likelihood and why squared error; covariance and correlation; PCA.
5. **The big equations** (10): linear regression read symbol by symbol; its gradient and the normal equations; ridge; logistic regression and binary cross-entropy (gradient $(p - y)x$); softmax and categorical cross-entropy (gradient $\mathbf p - \mathbf y$); entropy and KL; layers; backpropagation; momentum and Adam; attention.
6. **Reading papers** (2): a five-step method; practice on backprop, Adam, attention, KL, the policy gradient, Bayes and the normal density.

## Checks

| Command | What it checks |
|---|---|
| `npx vitest run src/labs/math-for-ml --exclude "**/*.desktop.test.js"` | Engine = Python (`engine/parity.test.js`); every predict's answer = engine, every note finds its line, every function documented (`lessons/lessons.test.js`); every Python statement explained (`lessons/coverage.test.js`); every lesson and figure renders with its controls exercised, the falling-ball figure's linked views, the decoder's lesson links, progress kept and recovered, and the Python tab (`render.test.jsx`); strict bundle (`bundle.test.js`) |
| `MATH_PYTHON=python3 npx vitest run src/labs/math-for-ml/stepper.desktop.test.js` | Every Python-tab program in the real A-Arcade stepper, each line's worked arithmetic against Python, and regression and backprop against the engine |
| `python3 src/labs/math-for-ml/tools/make_parity.py` | Regenerate parity data after changing a program |

## Where we stopped

2026-10-13: the full curriculum is built (66 lessons, 54 figures, decoder, Python tab). All checks above pass; `npm run typecheck` is clean. Browser: lessons, figures (prediction line, Σ, sigmoid, gradient field, descent, transformations, least squares, Bayes, normal builder, logistic fit, network forward and backward, Adam against gradient descent, softmax, attention, equation anatomy) and the decoder inspected; no page errors.

Not done, if wanted next: exercises where the learner writes the formula as code and it is checked; more equations in the decoder (ELBO, GAN objective, diffusion); a convolution lesson (Neural Net Lab covers it); a lesson on the Jacobian for vector-valued functions.
