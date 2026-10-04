# Mathematics notebooks: learning path and reference standard

This standard applies to new Mathematics Through Computation notebooks. Finishing the missing series material is the current priority; revisions of published notebooks are deferred for a later decision. It supplements [the curriculum](math-series-curriculum.md) and [the notebook format](notebook-series-curriculum.md).

## Two ways to use each notebook

A learner following the series should encounter each prerequisite before it is needed. A reader opening one notebook for reference should find a short prerequisite list, local definitions, an executable worked example, assumptions, and a compact procedure they can reuse. Reference use does not mean every advanced notebook starts again with arithmetic.

At the start, state what the learner will be able to do and name the specific prerequisite ideas. Link to available notebooks using `#/notebook-lab?lesson=<id>`. Do not link to an unwritten notebook as though it is available. State which cells must run first; either import dependencies locally or explain their shared setup.

## Concrete example, operation, code, notation

Introduce an idea in this order:

1. A question with small, concrete inputs and meaningful units.
2. A worked calculation the reader can follow by hand.
3. The steps of the operation in plain language.
4. A short, readable implementation, with an explanation of how each important line implements those steps.
5. Compact notation, read aloud and decoded symbol by symbol.
6. A library implementation when it adds value, compared with the explicit implementation.

The notebook renderer requires a math box before every demo. That box can show the concrete arithmetic. It need not start with the most abstract formula. Teach the operation in prose before the box and put unfamiliar compact notation after the initial example where appropriate.

For a sum, begin with `2 + 4 + 6`. Explain a total starting at zero, a loop visiting each item, and an update adding that item. Only then introduce sigma as an instruction to add. Define the index, its starting and stopping values, and the expression evaluated at each step. Explain that mathematical inclusive bounds differ from Python's exclusive `range` endpoint. A finite sum can be implemented by a loop; sigma is not itself a Python loop, and an infinite series cannot be evaluated by simply running forever.

Use the same bridge for products and running products, subscripts and list indexing, piecewise functions and `if`, vectors and coordinate lists, matrices and transformations, and derivatives and measured changes. Explain where an analogy stops being exact.

## Symbol and code contracts

- Define every new symbol before or at its first use. Include how to say it, what it represents, its units where applicable, and its code name.
- Explain overloaded notation locally: `=` versus `==`, multiplication by adjacency versus `*`, powers versus `**`, absolute-value bars versus `abs`, and mathematical subscripts versus zero-based indexing.
- Greek letters are names, not explanations. “Sigma is the spread” does not teach how spread is calculated.
- A reference to a later lesson does not excuse using its unexplained formula now. Supply the needed small derivation, use a simpler example, or defer the dependency.
- Explain imports, new library calls, shapes, axes, return values and non-obvious syntax. Prior Python knowledge does not imply prior NumPy or mathematical-programming knowledge.
- Prefer named intermediate values and ordinary loops before comprehensions, vectorised expressions or nested one-liners. Show the shorter form after the reader can explain the explicit one.
- Keep unrelated advanced facts out of an introductory example. A factorial does not help teach quotient and remainder. Exponential noise models do not help introduce arrays.

## Practice and reference

Each teaching section has a worked example, a prediction and an explanation of the observed result. Challenges assess only operations already taught. They have a starter, diagnostic feedback, a hint, a tested reference solution, and boundary cases that matter to the concept.

Close with a compact reference: the operation, its notation, its code equivalent, its assumptions, and a short procedure. Use lists rather than Markdown tables, which the notebook renderer does not support. Add a transfer question that changes a meaningful part of the example.

## Accuracy and verification

Distinguish exact mathematics, measurement uncertainty and floating-point arithmetic. Avoid blanket rules such as “never compare floats with equality,” “Decimal arithmetic is exact,” or “a sum of floats is always correctly rounded.” State the relevant conditions and demonstrate the failure mode.

Run the series checker and validate parsed notebook LaTeX. Open the actual notebook in the app and execute demos; inspect plots and challenge controls. Review code-to-math explanations and prerequisite order manually: passing a checker cannot establish that a lesson teaches well.

Preserve published lesson ids. Published challenge progress uses cell ids, which the parser derives from positions. Retain challenge meanings and cell order during explanation-only revisions. Before moving, removing or replacing assessed material, implement and verify a progress migration rather than allowing an old passed cell to count as a different challenge. Code revisions also invalidate saved working copies under the existing lesson-version mechanism; document that effect.

## Deferred observations about published lessons

The opening sample exposed these specific issues:

- `numbers-exact-and-approximate`: unrelated factorial and floor symbols, an unexplained relative-error model, a categorical float-equality rule, and a compensated-summation challenge whose operations need a worked trace.
- `quantities-and-units`: exponent dictionaries and operator methods need a concrete units calculation before the general representation.
- `ratios-rates-and-scaling`: the normalisation section uses indexed summation; teach the loop and index mapping before the compact formula.
- `arrays`: the introduction to arrays also introduces standard deviation, `argmax`, exponential warm-up, random noise and modular arithmetic. Separate array operations from these later mathematical dependencies.
- `accumulation`: integral, sigma, subscripts, starred sample points and delta appear together. Build the rectangle calculation and running total before presenting the compressed form.
- `statistics-from-measurements`: derive the average and squared deviations with a small data set and loops before the mean and sample-standard-deviation formulas.

This is an opening sample, not a completed audit of every lesson or an active rewrite queue. Keep these observations for the later revision decision. For now, continue writing missing notebooks in manifest order, recording required ideas and first definitions. Use the trigonometric-identities notebook as a quality baseline and strengthen the code-to-math and reference explanations in subsequent notebooks.
