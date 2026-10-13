# Math for ML Lab

Route: `#/lab/math-for-ml`. Uses the shared QMaze paper theme and Neural Net Lab's
ordered explanation, figure, and check renderer. No programming prerequisite.

## Available opening chapter

The falling-ball story develops observation, units and reference points, paired
measurements, graphs and function notation, signed change, and average velocity.
The clock, 2D scene, table, and graph use one numerical engine. Learners scrub
time, inspect table rows, choose comparison endpoints, and select quantities to
see their symbols expanded into numerical calculations. Playback is opt-in and
stops on navigation or after first ground contact. Progress is local to the device;
reading completion is explicitly separate from solved checks and mastery.

The simulator uses an ideal fall from rest at 20 m with downward acceleration
10 m/s², without air resistance, ending at 2 s. Its assumptions and arithmetic
rule are disclosed in each figure. The opening chapter does not claim to derive
the physical model or infer a unique curve from finite observations.

## Planned continuation

Calculus, linear algebra, and statistics are full core strands, not optional
appendices. The journey outline groups topics rather than prescribing that an
entire strand must finish before the next begins. Teach each prerequisite before
using it; interleave small lessons when it makes the connection more concrete.

- **Linear algebra:** coordinates, vectors, addition, scaling, length and
  direction; dot products as projection and weighted combination; matrices as
  transformations and composition; systems of equations, span, independence and
  least squares; then eigenvectors and principal components after variance is
  established. Start with 2D arrows, grids and explicit numerical operations.
- **Statistics and probability:** repeated measurements, frequency tables,
  distributions, mean and median, spread, variance and standard deviation;
  samples versus populations and sampling bias; probability, conditional
  probability, Bayes' rule and expectation; sampling variability, estimation,
  confidence intervals and hypothesis tests with assumptions and correct
  interpretations; covariance, correlation, regression and residuals. Distinguish
  association from causation and parameter uncertainty from prediction error.
- **Where the strands meet:** least-squares fitting from geometric, calculus,
  and statistical viewpoints; train/validation/test separation, leakage,
  generalization and uncertainty before making claims about learned models.

Limits and derivatives; accumulation and derivation of the motion relationship;
scaling, offsets and algebra; vectors and matrices; data and uncertainty; loss,
partial derivatives and optimization; composition and backpropagation. The lab's
journey view labels these as planned. This is an opening chapter, not a completed
mathematics-for-machine-learning curriculum.

Authoring standard: observable meaning before notation; define units, reference
points and every symbol; show numerical and algebraic steps; distinguish
assumptions, evidence and conclusions; pair intuition with precise statements.
Use 2D mathematical figures. Introduce applications as the mathematics supports
them. Preserve existing calculus lesson IDs and routes.

## Verification

Run `npx vitest run src/labs/math-for-ml` for numerical interval validation,
linked measurements, endpoint calculations, lesson rendering, progress recovery
and persistence. Run `npm run facts` after adding the lab, followed by
`npm run catalog:check`. Inspect the actual lab in a browser at wide and narrow
widths before delivery.

Verified on 2026-10-12: six scoped tests pass; typecheck exits without diagnostics;
facts regeneration and catalog check succeed (the catalog reports 14 existing
content problems). Browser checks cover playback, table-to-scene/graph updates,
endpoint selection and the resulting -10 m/s calculation, and a 390 px maximized
window. Shrinking the viewport with an already-open unmaximized desktop window
can clip that outer window; maximize it to fit the viewport. A full production
build was not run. The browser also logged an unrelated Trystero peer-close error.
