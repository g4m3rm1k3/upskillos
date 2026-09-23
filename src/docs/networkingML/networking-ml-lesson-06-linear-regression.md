# Lesson 6 — Linear Regression From Scratch

## What you'll learn
- What "training a model" actually means, mechanically: adjusting two
  numbers to minimize a measurable error
- Mean squared error — the actual formula "how wrong is this line" reduces
  to
- Gradient descent — using the *derivative* of the error (Lesson 25 of
  [[frontend-curriculum]], reused directly, not re-taught) to know which
  direction, and how far, to adjust
- Recording training history and animating the fit line live in the
  browser — watching the model learn, not just reading a final number

## What you'll build
A from-scratch linear regression trained via gradient descent on a small
dataset, its history of every intermediate line recorded, then replayed as
a live animation in the browser showing the line visibly converging onto
the data.

## The question
"The model learns a line that fits the data" is a sentence you've probably
heard before. What does "learns" actually *mean*, concretely — what
number(s) change, based on what calculation, and why does that calculation
make the line better rather than worse or random?

## 1. Predict

A line is `y = slope * x + intercept` — two numbers, `slope` and
`intercept`, define it completely. If you have a set of real
`(x, y)` data points, and a guess at `slope`/`intercept`, predict: what
single measurement would tell you "how wrong" this particular guess is,
using only the real data and the line's predicted `y` values at each real
`x`?

## 2. Try it — measuring error (the loss function)

```python
dataPoints = [(1, 3), (2, 5), (3, 7), (4, 9), (5, 11)]

def predictY(x, slope, intercept):
    return slope * x + intercept

def meanSquaredError(dataPoints, slope, intercept):
    totalSquaredError = 0
    for x, actualY in dataPoints:
        predictedY = predictY(x, slope, intercept)
        error = predictedY - actualY
        totalSquaredError += error * error
    return totalSquaredError / len(dataPoints)

print(meanSquaredError(dataPoints, slope=1, intercept=0))
print(meanSquaredError(dataPoints, slope=2, intercept=1))
```

### What this code does

**`dataPoints = [(1, 3), (2, 5), (3, 7), (4, 9), (5, 11)]`**
- Deliberately chosen so the real relationship is exactly `y = 2x + 1` —
  knowing the "correct" answer in advance lets you directly verify
  gradient descent actually finds it, rather than trusting an opaque
  result.

**`error = predictedY - actualY`**
- **This is the direct answer to your Predict question, refined.** The raw
  difference between what the line predicts and what's actually true, at
  one specific data point.

**`totalSquaredError += error * error`**
- **Squaring**, not just summing raw errors directly. Two real reasons,
  both worth knowing explicitly: squaring makes every error
  **non-negative** (a prediction that's `+3` too high and one that's `-3`
  too low would otherwise cancel out if summed directly, hiding real
  error), and squaring **penalizes large errors disproportionately more**
  than small ones (an error of `4` contributes `16`, not just `4` —
  meaningfully worse than two errors of `2` each contributing `4`,
  totaling `8`) — a deliberate modeling choice, not an arbitrary formula.

**`return totalSquaredError / len(dataPoints)`**
- Averaging across all data points — this is the **mean** in "mean
  squared error" (MSE), making the measurement comparable across datasets
  of different sizes rather than growing arbitrarily just from having
  more data points.

### What happens

`meanSquaredError` with `slope=2, intercept=1` (the actual correct
relationship) should print `0` (or extremely close to it, for
floating-point reasons) — confirming the loss function correctly
recognizes the perfect line as having zero error, while `slope=1,
intercept=0` (a wrong guess) produces a meaningfully larger, nonzero
number.

## 3. Why — gradient descent, using the derivative directly

**This is where [[frontend-curriculum]] Lesson 25's derivative concept
gets reused, not retaught.** Recall: a derivative tells you the
*instantaneous rate of change* of a function at a point — here, the
function is `meanSquaredError`, and what we want to know is: **if I
nudge `slope` slightly, does the error go up or down, and by how much?**
That's exactly a derivative, just computed with respect to `slope`
(and separately, `intercept`) instead of `t`.

```python
def computeGradients(dataPoints, slope, intercept):
    slopeGradientSum = 0
    interceptGradientSum = 0
    numberOfPoints = len(dataPoints)

    for x, actualY in dataPoints:
        predictedY = predictY(x, slope, intercept)
        error = predictedY - actualY
        slopeGradientSum += 2 * error * x
        interceptGradientSum += 2 * error

    slopeGradient = slopeGradientSum / numberOfPoints
    interceptGradient = interceptGradientSum / numberOfPoints
    return slopeGradient, interceptGradient
```

**`slopeGradientSum += 2 * error * x`** / **`interceptGradientSum += 2 * error`**
- **These are the actual derivatives of the mean-squared-error formula**,
  worked out symbolically in advance (the calculus itself — applying the
  chain rule to `(slope*x + intercept - actualY)²` — is exactly Lesson
  25's derivative concept, applied to a two-variable function; the full
  symbolic derivation is standard and available in any reference, and
  isn't re-derived line-by-line here, the same way Lesson 25 didn't
  derive `Math.sin` from first principles either). **What matters is what
  they mean, not re-deriving them**: `slopeGradient` tells you exactly how
  much the error would change per-unit change in `slope`, right now, at
  the current guess — precisely the same "rate of change at this specific
  point" concept as Lesson 25's `slopeAt` function, just computed exactly
  via calculus here instead of Lesson 25's tiny-epsilon numerical
  approximation (both are valid; this lesson uses the exact symbolic
  version since it's cleanly available for this specific formula).

```python
def trainLinearRegression(dataPoints, learningRate, numberOfIterations):
    slope = 0
    intercept = 0
    trainingHistory = []

    for iteration in range(numberOfIterations):
        slopeGradient, interceptGradient = computeGradients(dataPoints, slope, intercept)

        slope -= learningRate * slopeGradient
        intercept -= learningRate * interceptGradient

        trainingHistory.append({"slope": slope, "intercept": intercept})

    return slope, intercept, trainingHistory
```

**`slope -= learningRate * slopeGradient`**
- **This is the entire mechanism of "learning."** The gradient tells you
  the direction that *increases* error (a positive gradient means "error
  goes up if slope goes up") — so moving *opposite* the gradient
  (subtracting it) moves toward *lower* error. This is exactly the same
  shape as [[frontend-curriculum]] Lesson 25's spring formula
  (`velocity += springForce`) and Lesson 22's "ease toward a target"
  pattern — a value nudged, repeatedly, by some computed quantity, each
  step getting closer to a goal.
- `learningRate` — how big a step to take per iteration. **This is a real,
  practical parameter with real consequences, not a free-to-ignore
  detail**: too small, and training takes many more iterations than
  necessary to converge; too large, and the update can overshoot past the
  actual minimum, potentially making error *worse* each step instead of
  better (directly explored in Section 6).

### What happens

Each iteration computes the current error's gradient with respect to both
`slope` and `intercept`, nudges both slightly against their gradients, and
records the resulting line — repeated `numberOfIterations` times, the line
should visibly converge toward `slope ≈ 2, intercept ≈ 1`, the actual
relationship the data was generated from.

## 4. Change one thing

```diff
-slope, intercept, trainingHistory = trainLinearRegression(dataPoints, learningRate=0.01, numberOfIterations=1000)
+slope, intercept, trainingHistory = trainLinearRegression(dataPoints, learningRate=0.001, numberOfIterations=1000)
```

**What changed:** the learning rate, ten times smaller.
**What did not change:** the number of iterations, or the gradient
computation itself.
**Predict, then verify**: with the same iteration count, the final
`slope`/`intercept` are **noticeably further** from the true `2`/`1` than
before — a smaller learning rate takes smaller steps per iteration, so the
same fixed number of iterations simply doesn't cover as much ground. This
directly demonstrates learning rate and iteration count as two separate,
interacting knobs — you'd need proportionally *more* iterations to reach
the same convergence with this smaller rate, not just accept a worse
result.

## 5. Put it in the project — recording and visualizing the training history

```python
import json

slope, intercept, trainingHistory = trainLinearRegression(
    dataPoints, learningRate=0.01, numberOfIterations=200
)

outputData = {
    "dataPoints": dataPoints,
    "trainingHistory": trainingHistory
}

with open("training_history.json", "w") as outputFile:
    json.dump(outputData, outputFile)

print("Final slope:", slope, "intercept:", intercept)
print("Saved", len(trainingHistory), "steps to training_history.json")
```

**`json.dump(outputData, outputFile)`**
- Writes the entire training history — every intermediate `(slope,
  intercept)` pair from every iteration — as a JSON file, exactly the
  format `fetch`/`response.json()` (Lesson 6 of the frontend curriculum)
  already knows how to consume directly, no new parsing concept needed on
  the frontend side.

**The frontend half — animating the fit line converging:**

```html
<canvas id="regressionCanvas" width="400" height="400"></canvas>
<script>
  const canvas = document.getElementById("regressionCanvas");
  const context = canvas.getContext("2d");

  fetch("training_history.json")
    .then((response) => response.json())
    .then((trainingData) => {
      let currentStepIndex = 0;

      function drawStep() {
        const step = trainingData.trainingHistory[currentStepIndex];

        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = "steelblue";
        trainingData.dataPoints.forEach(([x, y]) => {
          context.beginPath();
          context.arc(x * 60, canvas.height - y * 30, 5, 0, Math.PI * 2);
          context.fill();
        });

        context.strokeStyle = "crimson";
        context.beginPath();
        context.moveTo(0, canvas.height - step.intercept * 30);
        context.lineTo(
          canvas.width,
          canvas.height - (step.slope * (canvas.width / 60) + step.intercept) * 30
        );
        context.stroke();

        currentStepIndex = (currentStepIndex + 1) % trainingData.trainingHistory.length;
        requestAnimationFrame(drawStep);
      }

      drawStep();
    });
</script>
```

### Code walkthrough

**`fetch("training_history.json").then((response) => response.json()).then(...)`**
- The exact same `fetch`/`.then` pattern from [[frontend-curriculum]]
  Lesson 6 — no new networking concept, just reading a local JSON file
  the same way you'd read any API response.

**`trainingData.dataPoints.forEach(([x, y]) => { ... })`**
- Destructuring each `[x, y]` pair directly in the `forEach` callback's
  parameter — plotting the real, fixed data points once, every frame
  (they never change) as small blue circles.

**`context.moveTo(0, ...); context.lineTo(canvas.width, ...)`**
- Drawing the current step's line across the full canvas width, computing
  its y-position at both the left edge (`x=0`, so just `intercept`) and
  the right edge (`x` at the canvas's full width, converted back from
  pixels to the data's original coordinate scale) — the exact
  `y = slope * x + intercept` formula, now drawn rather than just
  computed.

**`currentStepIndex = (currentStepIndex + 1) % trainingData.trainingHistory.length;`**
- Cycles through every recorded training step, looping back to the start
  once it reaches the end (`%`, the same wrap-around technique from
  [[frontend-curriculum]] Lesson 34's noise-anchor wrapping) — replaying
  the entire training process, visibly, as a continuous animation.

### What happens

The red line visibly starts wherever the very first, essentially random
`slope`/`intercept` placed it, and — frame by frame, replaying the
recorded history — swings and converges onto the blue data points, making
"the model learns" into something you watch happen rather than a phrase to
take on faith.

## 6. Trap

Predict, then test: set `learningRate` to something deliberately too
large (e.g. `0.5` instead of `0.01`), keep `numberOfIterations` the same,
and re-generate `training_history.json`.

Run it, and watch the animation. **The trap: instead of smoothly
converging, `slope`/`intercept` may swing wildly, growing larger and
larger in magnitude each iteration rather than settling down** — this is
a real, named failure mode called **divergence**: too large a learning
rate causes each update to overshoot the actual minimum so badly that the
*next* gradient is even larger, compounding rather than correcting. **This
is worth watching happen rather than just reading about**, since it's a
completely real, common problem in actual ML training, not a
lesson-specific contrivance — tuning the learning rate correctly is a
genuine, practical skill, and this animation makes divergence's visual
signature ("the line goes berserk instead of settling") directly
recognizable.

## 7. Exercise

- **Predict:** If `dataPoints` had one clear outlier (e.g. adding
  `(3, 50)` to the otherwise-clean dataset), how would you expect the
  final learned line to be affected, given that mean squared error
  specifically penalizes large errors more heavily? Test it and observe
  how much the line shifts to accommodate that single point.
- **Modify:** Record and additionally save each iteration's
  `meanSquaredError` value alongside `slope`/`intercept` in the training
  history — plot it as a separate declining curve, confirming visually
  that error decreases (mostly) monotonically as training progresses.
- **Break:** Initialize `slope`/`intercept` to something far from zero
  (e.g. `slope = 1000`) instead of `0` — does gradient descent still
  successfully converge with the same learning rate, or does the far
  starting point cause its own problems?
- **Trace:** Using [[frontend-curriculum]] Lesson 25's `slopeAt` function
  (numerical derivative approximation), verify this lesson's *exact*,
  symbolic `slopeGradient` formula agrees with a numerical approximation
  at one specific `(slope, intercept)` point — direct, hands-on
  confirmation that the calculus here is doing exactly what Lesson 25's
  numerical method does, just computed differently.

## What to remember
- "Training a model" here means: measure error (MSE), compute its
  derivative with respect to each learnable number, nudge those numbers
  opposite the derivative, repeat — genuinely nothing more mysterious than
  that for this simplest case.
- Squaring errors before averaging (MSE) makes all errors positive and
  penalizes large errors disproportionately — a deliberate modeling
  choice, not an arbitrary formula.
- Gradient descent directly reuses Lesson 25's "derivative = rate of
  change, use it to move toward a goal" concept — the same underlying idea
  as spring physics, now applied to two abstract numbers instead of a
  screen position.
- Too large a learning rate causes visible, real divergence — not a
  hypothetical failure mode, something this lesson's animation makes
  directly recognizable.

## Next lesson
Lesson 7 makes explicit what gradient descent is actually *descending*: a
loss landscape — a 3D surface where height represents error at every
possible `(slope, intercept)` combination — rendered with Three.js, so you
can watch the gradient descent path as literally a ball rolling downhill,
not just an abstract number decreasing.
