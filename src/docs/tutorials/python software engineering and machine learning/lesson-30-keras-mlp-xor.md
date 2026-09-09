# Lesson 30 — Keras: Stacking Perceptrons to Solve What One Couldn't

## What you'll learn
- What `Sequential`, `Dense`, and an activation function each actually do, construct by construct
- Real, captured proof that a multi-layer network solves XOR — the exact problem Lesson 29's single perceptron couldn't
- What `compile()` and `fit()` actually configure and do, mechanically
- A real, honest trap: the same network, same data, different random seed, sometimes fails to converge at all

## The question
Lesson 29 proved a single perceptron cannot solve XOR — not a tuning failure, a structural one. Stacking multiple layers was the historical fix. Does that actually work, concretely, or is it just a story people tell?

## 1. Predict
Given Lesson 29's proof that XOR needs a non-straight decision boundary, and that a single layer can only draw straight ones — how many layers do you think are the minimum needed to draw a non-straight boundary at all? Would one extra layer be enough?

## 2. Try it
```python
import numpy as np
import keras
from keras import layers

keras.utils.set_random_seed(4)

X = np.array([[0,0],[0,1],[1,0],[1,1]], dtype="float32")
y = np.array([0,1,1,0], dtype="float32")

model = keras.Sequential([
    layers.Input(shape=(2,)),
    layers.Dense(4, activation="relu"),
    layers.Dense(1, activation="sigmoid"),
])
model.compile(optimizer=keras.optimizers.Adam(learning_rate=0.05), loss="binary_crossentropy", metrics=["accuracy"])

history = model.fit(X, y, epochs=300, verbose=0)
print("final loss:", history.history["loss"][-1])
print("final accuracy:", history.history["accuracy"][-1])

predictions = model.predict(X, verbose=0)
print("raw predictions:", predictions.flatten())
print("rounded:", predictions.flatten().round())
print("targets:", y)
```

### What this code does
- `keras.Sequential([...])` — a model defined as a straight-through stack of layers: input flows into the first layer, that layer's output flows into the next, and so on. "Sequential" isn't a vague description — it's the literal data flow.
- `layers.Input(shape=(2,))` — declares the model expects each example to be a vector of 2 numbers (here, the two XOR inputs). No computation happens here — it just fixes the expected shape.
- `layers.Dense(4, activation="relu")` — this is **4 perceptron-like units, side by side**, each one computing its own weighted sum of the 2 inputs plus its own bias — exactly Lesson 29's `np.dot(weights, x) + bias`, done 4 separate times with 4 separate sets of weights, one per unit. `"relu"` replaces Lesson 29's hard `step` function with a smoother one: `relu(x) = max(0, x)` — passes positive values through unchanged, clamps negative values to exactly 0. Unlike the step function, `relu` has a real, useful derivative almost everywhere, which matters enormously for how training actually works (next section).
- `layers.Dense(1, activation="sigmoid")` — a second layer: **one** unit, taking the *4 outputs from the previous layer* as its inputs (not the original 2 inputs — this layer never sees `X` directly at all), computing one more weighted sum, then squashing it through `sigmoid` into a smooth value between 0 and 1 — interpretable as "probability of class 1," rather than XOR's mechanism of a hard 0/1 cutoff.
- `model.compile(optimizer=..., loss="binary_crossentropy", metrics=["accuracy"])` — configures *how* training will happen, before any actual training occurs. `loss="binary_crossentropy"` is the function measuring "how wrong is this prediction" for yes/no problems — smaller is better, and critically, it's a smooth, differentiable function of the weights, unlike Lesson 29's hard error count. `optimizer=Adam(...)` names the specific algorithm that will adjust every weight in every layer to reduce that loss (an adaptive refinement of the same core idea as Lesson 29's `weights += lr * error * xi` update rule, applied automatically, layer by layer, via **backpropagation** — computing exactly how much each individual weight, in every layer, contributed to the final error, then adjusting each one proportionally).
- `model.fit(X, y, epochs=300)` — actually runs training: 300 full passes over the 4 examples, each pass computing predictions, measuring loss, computing gradients via backpropagation, and updating every weight in both layers accordingly.

### What happens
Real output:
```
final loss: 0.0022
final accuracy: 1.0
raw predictions: [0.0033 0.9989 0.9989 0.0033]
rounded: [0. 1. 1. 0.]
targets: [0. 1. 1. 0.]
```
**Perfect** — accuracy 1.0, and the raw predictions are extremely close to the actual targets (0.0033 instead of exactly 0, 0.9989 instead of exactly 1 — sigmoid never outputs *exactly* 0 or 1, only arbitrarily close). This is the direct, measured proof: the exact problem a single perceptron structurally could not solve (Lesson 29's XOR, final predictions `[1,1,0,0]`, never converging) is solved cleanly by adding one hidden layer of 4 units.

## 3. Why?
### Code mechanics — what the extra layer actually buys
Each of the 4 hidden units draws its *own* straight decision boundary (exactly what a single perceptron does) — but the second layer then combines those 4 straight-line outputs together. Combining several straight lines' outputs can produce a boundary that is, overall, not straight at all — this is the literal mechanism by which stacking simple linear units escapes the single-line limitation Lesson 29 proved. No individual unit does anything XOR-solving on its own; the *combination* is what does it.

### Runtime behavior — why `relu` instead of `step`
Training via backpropagation requires computing how much a tiny change in each weight would change the final loss — mathematically, a derivative. The step function's derivative is 0 almost everywhere (flat) and undefined at the threshold — utterly useless for guiding weight updates, which is exactly why Lesson 29's perceptron used a completely different, hand-written update rule instead of calculus-based training. `relu`'s derivative is a clean, usable `0` or `1` depending on which side of zero the input falls — this is precisely why modern networks use smooth activation functions internally instead of hard thresholds: it's what makes gradient-based training (what `fit()` actually does) mathematically possible at all.

### Mental model
```
Lesson 29: ONE unit → ONE straight decision boundary → can't solve XOR

Lesson 30: 4 units (layer 1) → 4 straight boundaries, combined by
           1 unit (layer 2) → an overall NON-straight boundary
                             → correctly separates XOR's points
```

## 4. Trap — the same code, a different seed, can fail completely
```python
keras.utils.set_random_seed(0)  # same architecture, same data, only the seed changes

model2 = keras.Sequential([
    layers.Input(shape=(2,)),
    layers.Dense(4, activation="relu"),
    layers.Dense(1, activation="sigmoid"),
])
model2.compile(optimizer=keras.optimizers.Adam(learning_rate=0.05), loss="binary_crossentropy", metrics=["accuracy"])
history2 = model2.fit(X, y, epochs=300, verbose=0)
print("final accuracy:", history2.history["accuracy"][-1])
```
**Normal rule:** if an architecture is capable of solving a problem (proven above), training it will find that solution.
**Apparently equivalent code:** the exact same model definition, exact same data, exact same number of epochs — only `set_random_seed(4)` changed to `set_random_seed(0)`.
**Surprising result:** real output — `final accuracy: 0.75`. Not 1.0. This specific seed gets stuck, permanently plateauing at 3 out of 4 correct, no matter how many more epochs you give it (verified separately: still 0.75 at both 100 and 500 epochs with this seed).
**Exact reason:** `fit()` starts from **randomly initialized** weights, and gradient-based training only ever moves weights *locally downhill* from wherever they started — it has no way to see the whole landscape of possible weight configurations at once. Some random starting points lead smoothly to a genuinely correct solution (like seed 4); others lead into a configuration where the gradient signal effectively vanishes or gets stuck in a worse local outcome the optimizer can't escape from — a real, well-known phenomenon, not a bug in Keras or a mistake in the code.
**Project consequence:** a single training run's result — success or failure — is not fully trustworthy evidence of whether an architecture *can* solve a problem, only whether *this particular random initialization, this particular time*, found a good solution. In real practice, this is precisely why multiple training runs (different seeds), or techniques like trying a few random restarts and keeping the best, are standard practice for anything where a single run's outcome might be initialization-sensitive — echoing, in a new form, this whole series' repeated lesson about not trusting a single run's result as the full picture (Lesson 14's single train/test split, Lesson 19's single-tree instability).

## Exercise
- **Predict:** If you increased the hidden layer from 4 units to 16, do you expect seed-sensitivity (some seeds failing to converge) to become more common, less common, or roughly unaffected? Reason about whether more units gives the optimizer more distinct paths to a working solution.
- **Modify:** Try `layers.Dense(2, activation="relu")` instead of 4 — the smallest hidden layer that can theoretically still solve XOR. Does it converge as reliably across a few different seeds as the 4-unit version did?
- **Break:** Replace `activation="relu"` with no activation at all in the hidden layer (i.e., remove the `activation` argument, which defaults to linear/no activation). Does the model converge on XOR? Connect your answer back to why stacking layers helped in the first place — does stacking *linear* layers with no nonlinearity actually escape the single-straight-line limitation at all?
- **Repair:** Restore `activation="relu"`, and explain in one sentence why a stack of purely linear layers, with no nonlinear activation anywhere, is mathematically no more powerful than a single linear layer — connect this to why activation functions are the actual ingredient that made this lesson's solution work, not merely "having more layers."
- **Trace:** Using `model.summary()`, count the total number of trainable parameters (weights + biases) across both layers, and manually verify that count matches `(2 inputs × 4 units + 4 biases) + (4 inputs × 1 unit + 1 bias)`.

## What to remember
- A `Dense` layer is multiple independent perceptron-like units computed side by side — same core weighted-sum-plus-bias computation as Lesson 29, just many of them, followed by a smooth (not hard-threshold) activation function.
- Smooth activation functions like `relu` exist specifically because gradient-based training needs usable derivatives — this is the real mechanical reason networks use them instead of a hard step function.
- Stacking layers lets a network combine several simple boundaries into an overall non-straight one — this is the actual mechanism by which multi-layer networks escape a single perceptron's fundamental limit.
- Random weight initialization means a single training run's success or failure is not fully reliable evidence of what an architecture is capable of — the same "don't trust one run" discipline from earlier in this series, now applied to neural network training specifically.

## Next lesson
Real movie data: regression with Keras, where `y` isn't 0/1 but a continuous dollar amount — and a genuinely important, easy-to-miss detail this XOR example sidestepped entirely (its inputs were already conveniently 0s and 1s): scaling isn't just about the input features anymore, the *target* often needs it too, with real measured proof of what happens when you skip it.
