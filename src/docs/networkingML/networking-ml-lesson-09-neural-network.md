# Lesson 9 — A Tiny Neural Network From Scratch

## What you'll learn
- What a **hidden layer** actually is: a second set of weights/sigmoids,
  structurally no different from Lesson 8's single layer, just chained
- Why chaining two linear-plus-sigmoid layers together, with nothing else
  changed, is exactly what lets the model finally bend a decision boundary
- The forward pass and backward pass (backpropagation) as working code —
  the *why* behind the update formulas is Lesson 10's job specifically;
  this lesson treats them as given, the same way Lesson 6 treated MSE's
  derivative as given
- Visualizing a hidden neuron's activation live, watching numbers that are
  normally invisible actually flow through the network

## What you'll build
A tiny neural network (2 inputs → hidden layer of 3 neurons → 1 output)
trained from scratch, correctly classifying the exact ring-shaped,
non-linearly-separable dataset that broke Lesson 8's logistic regression —
with a live visualization of hidden-neuron activations as data flows
through.

## The question
Lesson 8 ended stuck: a single layer of weights can only ever produce a
straight-line boundary, no matter how it's trained. If you took that exact
same layer's *output* and fed it as *input* into a second, identical kind
of layer, would that combination be capable of anything a single layer
alone genuinely cannot do?

## 1. Predict

You already know a single layer computes
`sigmoid(weight1*x1 + weight2*x2 + bias)` — one number out. Predict: if you
had **three** separate copies of this computation (three independent
weight/bias sets, all looking at the same `x1`/`x2` inputs), producing
**three** separate output numbers — and then fed *those three numbers* as
input into one final layer — do you think the *combination* could
represent a curved or more complex boundary, even though each individual
piece is still just a straight-line sigmoid computation?

## 2. Try it — the forward pass, one hidden neuron at a time

```python
import math
import random

def sigmoid(x):
    return 1 / (1 + math.exp(-x))

def forwardPass(x1, x2, hiddenWeights, hiddenBiases, outputWeights, outputBias):
    hiddenActivations = []
    for neuronIndex in range(len(hiddenBiases)):
        weightedSum = hiddenWeights[neuronIndex][0] * x1 + hiddenWeights[neuronIndex][1] * x2 + hiddenBiases[neuronIndex]
        hiddenActivations.append(sigmoid(weightedSum))

    outputWeightedSum = sum(
        outputWeights[i] * hiddenActivations[i] for i in range(len(hiddenActivations))
    ) + outputBias
    predictedProbability = sigmoid(outputWeightedSum)

    return hiddenActivations, predictedProbability
```

### What this code does

**`for neuronIndex in range(len(hiddenBiases)): ... hiddenActivations.append(sigmoid(weightedSum))`**
- **This is your Predict question's "three separate copies," made
  literal.** Each iteration computes **exactly Lesson 8's single-layer
  formula** — `sigmoid(weight1*x1 + weight2*x2 + bias)` — but with its
  *own* independent weights/bias (`hiddenWeights[neuronIndex]`,
  `hiddenBiases[neuronIndex]`), producing one number per **hidden
  neuron**. With 3 hidden neurons, this loop produces exactly 3 numbers,
  `hiddenActivations` — each one a genuinely independent "opinion" about
  the input, shaped by that neuron's own particular weights.

**`outputWeightedSum = sum(outputWeights[i] * hiddenActivations[i] ...) + outputBias`**
- **This is the direct answer to your Predict question**: the three
  hidden activations — not the original `x1`/`x2` — become the **input**
  to one final layer, which is, structurally, *again* exactly Lesson 8's
  formula, just with 3 inputs (the hidden activations) instead of 2 (the
  original features). `predictedProbability = sigmoid(outputWeightedSum)`
  — the network's single final output.
- **Nothing about either layer's formula is new.** The entire "neural
  network" is two chained copies of Lesson 8's exact computation — the
  *only* structurally new idea is chaining one layer's output into the
  next layer's input.

### What happens

Given a point `(x1, x2)`, the network computes 3 independent hidden
activations, then combines those into one final probability — the same
overall shape as Lesson 8's single computation, just with one extra stage
inserted in the middle.

## 3. Why — this extra stage is what enables curved boundaries

**No new code for this section — conceptual grounding for what Section 2
just built.**

- Each hidden neuron, on its own, still only "sees" the world through a
  straight-line lens — its own private straight-line boundary through
  `(x1, x2)` space. **But the *output* layer isn't looking at `(x1, x2)`
  anymore — it's looking at three numbers that each already encode "which
  side of a different straight line am I on."** Combining three different
  straight-line "opinions" through one more layer lets the network
  effectively carve out a region bounded by **multiple** lines at once —
  a triangle-like or more complex enclosed shape, genuinely impossible for
  any single straight line to represent, but achievable by combining
  several. **This is the real, complete answer to why a hidden layer
  fixes Lesson 8's stuck point**: more straight lines, combined, can
  approximate curves and enclosed regions — one straight line alone never
  can, no matter how it's positioned.

## 4. Change one thing

```diff
 def forwardPass(x1, x2, hiddenWeights, hiddenBiases, outputWeights, outputBias):
     hiddenActivations = []
-    for neuronIndex in range(len(hiddenBiases)):
+    for neuronIndex in range(1):
         weightedSum = hiddenWeights[neuronIndex][0] * x1 + hiddenWeights[neuronIndex][1] * x2 + hiddenBiases[neuronIndex]
         hiddenActivations.append(sigmoid(weightedSum))
```

**What changed:** forcing exactly 1 hidden neuron instead of however many
`hiddenBiases` actually contains.
**What did not change:** the output layer's code, or the overall
structure.
**Predict, then verify**: with only 1 hidden neuron, the network is
mathematically reduced back to being **equivalent to Lesson 8's plain
logistic regression** — one straight-line boundary, full stop, regardless
of how much training happens. This is worth confirming directly on the
ring-shaped dataset (Section 6): with 1 hidden neuron, it should fail
exactly the same way Lesson 8 did; with 3+ hidden neurons (Section 5), it
should succeed. **The number of hidden neurons is not a minor tuning
knob — it's what actually determines whether curved decision boundaries
are representable at all.**

## 5. Put it in the project — backpropagation (the update formulas, given)

**This section treats the following gradient formulas as given, the way
Lesson 6 treated MSE's derivative as given — the full chain-rule
derivation behind *why* these specific formulas are correct is Lesson
10's dedicated job, not repeated here.**

```python
def backwardPass(x1, x2, actualLabel, hiddenActivations, predictedProbability,
                  hiddenWeights, hiddenBiases, outputWeights, outputBias, learningRate):
    outputError = predictedProbability - actualLabel

    newOutputWeights = []
    for i in range(len(outputWeights)):
        gradient = outputError * hiddenActivations[i]
        newOutputWeights.append(outputWeights[i] - learningRate * gradient)
    newOutputBias = outputBias - learningRate * outputError

    newHiddenWeights = []
    newHiddenBiases = []
    for i in range(len(hiddenActivations)):
        hiddenError = outputError * outputWeights[i] * hiddenActivations[i] * (1 - hiddenActivations[i])
        weight0Gradient = hiddenError * x1
        weight1Gradient = hiddenError * x2
        newHiddenWeights.append([
            hiddenWeights[i][0] - learningRate * weight0Gradient,
            hiddenWeights[i][1] - learningRate * weight1Gradient
        ])
        newHiddenBiases.append(hiddenBiases[i] - learningRate * hiddenError)

    return newHiddenWeights, newHiddenBiases, newOutputWeights, newOutputBias
```

**`outputError = predictedProbability - actualLabel`**
- **Exactly Lesson 8's error term**, unchanged — the output layer's own
  gradient computation is structurally identical to a single logistic
  regression layer's, because, from the output layer's own perspective,
  it genuinely *is* one, just fed hidden activations instead of raw
  inputs.

**`hiddenError = outputError * outputWeights[i] * hiddenActivations[i] * (1 - hiddenActivations[i])`**
- **This is backpropagation's actual namesake — error flowing backward.**
  Each hidden neuron's own error signal is derived *from* the output
  layer's error (`outputError`), scaled by how much that specific hidden
  neuron actually influenced the output (`outputWeights[i]`) and by
  sigmoid's own local derivative at that neuron's activation
  (`hiddenActivations[i] * (1 - hiddenActivations[i])` — a real, standard
  fact about sigmoid's derivative, worth knowing exists here even before
  Lesson 10 derives it fully). **Every weight, at every layer, gets
  updated using the exact same `weight -= learningRate * gradient`
  pattern from Lesson 6 and 8** — nothing about the *update rule* itself
  is new; only how each layer's gradient gets computed, propagating
  backward from the output, differs.

### Training loop and visualizing hidden activations

```python
ringDataset = []
for _ in range(40):
    angle = random.uniform(0, 2 * math.pi)
    radius = random.uniform(0, 1)
    ringDataset.append((radius * math.cos(angle), radius * math.sin(angle), 0))
for _ in range(40):
    angle = random.uniform(0, 2 * math.pi)
    radius = random.uniform(2, 3)
    ringDataset.append((radius * math.cos(angle), radius * math.sin(angle), 1))

hiddenWeights = [[random.uniform(-1, 1), random.uniform(-1, 1)] for _ in range(3)]
hiddenBiases = [random.uniform(-1, 1) for _ in range(3)]
outputWeights = [random.uniform(-1, 1) for _ in range(3)]
outputBias = random.uniform(-1, 1)

activationHistory = []
for iteration in range(2000):
    x1, x2, actualLabel = random.choice(ringDataset)
    hiddenActivations, predictedProbability = forwardPass(
        x1, x2, hiddenWeights, hiddenBiases, outputWeights, outputBias
    )
    if iteration % 50 == 0:
        activationHistory.append({"hiddenActivations": hiddenActivations, "iteration": iteration})

    hiddenWeights, hiddenBiases, outputWeights, outputBias = backwardPass(
        x1, x2, actualLabel, hiddenActivations, predictedProbability,
        hiddenWeights, hiddenBiases, outputWeights, outputBias, learningRate=0.5
    )
```

**`radius = random.uniform(0, 1)` vs `random.uniform(2, 3)`**
- **This is Lesson 8's exact ring-shaped, non-linearly-separable dataset
  from its Trap section**, built explicitly here rather than only
  described — category `0` points cluster near the center, category `1`
  points form a ring around them, with a genuine gap between — no
  straight line can separate these two groups.

**`if iteration % 50 == 0: activationHistory.append(...)`**
- Recording hidden-neuron activations periodically (using the exact same
  `%` sampling technique from [[frontend-curriculum]] Lesson 34's
  noise-anchor wrapping and this curriculum's own earlier lessons) — this
  is what feeds the frontend visualization: watching each of the 3 hidden
  neurons' output values shift over the course of training, rather than
  only ever seeing the final result.

**Frontend visualization**: save `activationHistory` as JSON (Lesson 6's
pattern), then render three small bar/gauge elements (one per hidden
neuron), each animated via `requestAnimationFrame` stepping through the
recorded history — literally watching three previously-invisible numbers
rise and fall as training proceeds, directly visualizing what "a hidden
layer" concretely *is*: three real, changing numbers, not an abstract
concept.

## 6. Trap

Predict, then test: train this exact network on the ring dataset, then
separately train Lesson 8's plain logistic regression on the identical
data, and compare final accuracy on both.

Run it. **The trap, worth confirming directly rather than assuming: the
hidden-layer network should now correctly classify the ring data, while
Lesson 8's single-layer version remains stuck at whatever the best
possible single straight line can achieve (something close to random
guessing, given the ring's symmetric shape) — the exact predicted outcome
from Section 4's "1 hidden neuron reduces to Lesson 8" observation, now
confirmed with a genuinely harder dataset than any used earlier in this
curriculum.** This is worth treating as a real checkpoint, not a given:
if your hidden-layer version *doesn't* clearly outperform the single-layer
one here, something in the forward/backward pass implementation likely
has a bug worth hunting down before moving on — a real, practical
debugging signal this specific comparison is designed to surface.

## 7. Exercise

- **Predict:** If you increased the hidden layer from 3 neurons to 8, would
  you expect training to require more, fewer, or a similar number of
  iterations to reach good accuracy on the ring dataset? Test and compare.
- **Modify:** Add a **second** hidden layer (hidden layer 1 → hidden layer
  2 → output) — you'll need a second set of weights/biases and an
  additional forward/backward stage, following the exact same chaining
  pattern as layer 1 → output did.
- **Break:** Initialize every weight and bias to exactly `0` (instead of
  `random.uniform(-1, 1)`) and train. Does the network still learn
  correctly? (Research "symmetry breaking" briefly if it doesn't — a real,
  named reason neural networks specifically need randomized, not
  identical, initial weights.)
- **Trace:** For one single hidden neuron, using its final trained
  weights/bias, evaluate it at several `(x1, x2)` points by hand or in a
  separate script — sketch (roughly) where *that one neuron's* own
  straight-line boundary sits, separate from the network's overall
  (curved, correct) boundary.

## What to remember
- A hidden layer is structurally nothing more than several independent
  copies of Lesson 8's single-layer formula, each with its own weights —
  the "neural network" idea is chaining, not a fundamentally new
  computation.
- More straight-line "opinions," combined through a further layer, can
  jointly represent curved/enclosed boundaries no single straight line
  ever can — directly fixing Lesson 8's structural limitation.
- Backpropagation reuses the exact same `weight -= learningRate * gradient`
  update rule from Lessons 6 and 8 at every single weight in the network —
  only *how each gradient gets computed*, flowing backward from the
  output, is genuinely new here.
- Comparing directly against Lesson 8 on the identical hard dataset is a
  real, practical way to confirm a from-scratch implementation is actually
  correct, not just "doesn't crash."

## Next lesson
Lesson 10 goes back and derives this lesson's `hiddenError` formula fully,
one step of the chain rule at a time — the calculus this lesson used as a
given, made completely explicit, the same way [[frontend-curriculum]]
Lesson 25 made easing curves' derivatives explicit after Lesson 15 used
them implicitly.
